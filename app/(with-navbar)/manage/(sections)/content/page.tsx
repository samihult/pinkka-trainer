"use client";

import type React from "react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectFromListDialog } from "@/components/select-from-list-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ManageGroupCard } from "@/components/manage-group-card";
import { PinkkaImportProgressDialog } from "@/components/pinkka/pinkka-import-progress-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { logFirestoreError } from "@/lib/utils";
import {
  getGroups,
  getStacks,
  createGroup,
  createStack,
  importPinkkaGroup,
  isPinkkaImportInterruptedError,
  refreshEditableGroupFromPinkka,
  refreshEditableStackFromPinkka,
  updateGroup,
  updateStack,
  deleteGroup,
  deleteStack,
  getImportedPinkkaGroups,
  reorderItems,
  updateGroupStackOrder,
  type PinkkaImportProgress,
  type ImportedPinkkaGroupEntry,
} from "@/lib/firebase/firestore-helpers";
import type { Group, LocalizedText, Stack } from "@/lib/types";
import { getLocalizedText } from "@/lib/content/content-display";
import { ChevronDown, FolderOpen, Plus } from "lucide-react";

function createEmptyProgressLevel() {
  return {
    completed: 0,
    total: 0,
    currentEntityName: "",
    imageDownloadsCompleted: 0,
    imageDownloadsTotal: 0,
  };
}

function createEmptyPinkkaImportProgress(): PinkkaImportProgress {
  return {
    groups: createEmptyProgressLevel(),
    stacks: createEmptyProgressLevel(),
    species: createEmptyProgressLevel(),
  };
}

export default function ManagePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [groups, setGroups] = useState<Group[]>([]);
  const [stacks, setStacks] = useState<{ [key: string]: Stack[] }>({});
  const [importedPinkkaGroups, setImportedPinkkaGroups] = useState<
    ImportedPinkkaGroupEntry[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [activePinkkaRefresh, setActivePinkkaRefresh] = useState<{
    type: "group" | "stack";
    id: string;
  } | null>(null);
  const [pinkkaRefreshProgress, setPinkkaRefreshProgress] =
    useState<PinkkaImportProgress>(createEmptyPinkkaImportProgress());
  const interruptRefreshRef = useRef(false);

  // Group dialog state
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupNameFi, setGroupNameFi] = useState("");
  const [groupNameEn, setGroupNameEn] = useState("");
  const [groupNameSv, setGroupNameSv] = useState("");
  const [groupDescriptionFi, setGroupDescriptionFi] = useState("");
  const [groupDescriptionEn, setGroupDescriptionEn] = useState("");
  const [groupDescriptionSv, setGroupDescriptionSv] = useState("");
  const [showPinkkaGroupSelector, setShowPinkkaGroupSelector] = useState(false);

  // Stack dialog state
  const [showStackDialog, setShowStackDialog] = useState(false);
  const [editingStack, setEditingStack] = useState<Stack | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [stackNameFi, setStackNameFi] = useState("");
  const [stackNameEn, setStackNameEn] = useState("");
  const [stackNameSv, setStackNameSv] = useState("");
  const [stackDescriptionFi, setStackDescriptionFi] = useState("");
  const [stackDescriptionEn, setStackDescriptionEn] = useState("");
  const [stackDescriptionSv, setStackDescriptionSv] = useState("");

  const [draggedGroupIndex, setDraggedGroupIndex] = useState<number | null>(
    null,
  );
  const [draggedStackIndex, setDraggedStackIndex] = useState<number | null>(
    null,
  );
  const [draggedStackGroupId, setDraggedStackGroupId] = useState<string | null>(
    null,
  );

  const loadImportedPinkkaGroupEntries = useCallback(async () => {
    if (!user) {
      setImportedPinkkaGroups([]);
      return;
    }

    try {
      const importedPinkkaGroupsData = await getImportedPinkkaGroups();
      setImportedPinkkaGroups(importedPinkkaGroupsData);
    } catch (error) {
      logFirestoreError("Failed to load imported Pinkka groups", error);
      setImportedPinkkaGroups([]);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [groupsData, allStacks] = await Promise.all([
        getGroups(user.uid, { includeHidden: true }),
        getStacks(undefined, user.uid, { includeHidden: true }),
      ]);
      setGroups(groupsData);
      await loadImportedPinkkaGroupEntries();

      const stacksData = groupsData.reduce<{ [key: string]: Stack[] }>(
        (acc, group) => {
          const legacyStackIds = new Set(group.stackIds ?? []);
          const orderedStacks = [...allStacks]
            .filter(
              (stack) =>
                stack.parentGroupId === group.id ||
                (stack.parentGroupId === undefined &&
                  legacyStackIds.has(stack.id)),
            )
            .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
          acc[group.id] = orderedStacks;
          return acc;
        },
        {},
      );
      setStacks(stacksData);
    } catch (error) {
      logFirestoreError("Failed to load groups/stacks", error);
      setImportedPinkkaGroups([]);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [loadImportedPinkkaGroupEntries, toast, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleOpenPinkkaGroupSelector = useCallback(() => {
    void loadImportedPinkkaGroupEntries().finally(() =>
      setShowPinkkaGroupSelector(true),
    );
  }, [loadImportedPinkkaGroupEntries]);

  const buildLocalizedValue = (values: {
    fi?: string;
    en?: string;
    sv?: string;
  }): LocalizedText => {
    const nextValue: { fi?: string; en?: string; sv?: string } = {};
    if (values.fi) nextValue.fi = values.fi;
    if (values.en) nextValue.en = values.en;
    if (values.sv) nextValue.sv = values.sv;
    return Object.keys(nextValue).length > 0 ? nextValue : {};
  };

  const importedGroupOptions = useMemo(
    () =>
      importedPinkkaGroups.map((group) => {
        const stackCount = group.stackCount;
        const stackDescription =
          stackCount === 1 ? "1 stack" : `${stackCount} stacks`;
        const label =
          getLocalizedText(group.entity.name, "fi") ||
          getLocalizedText(group.entity.name, "en") ||
          getLocalizedText(group.entity.name, "sv") ||
          `Group ${group.groupId}`;

        return {
          id: String(group.groupId),
          label,
          description: stackDescription,
        };
      }),
    [importedPinkkaGroups],
  );

  // Group handlers
  const handleGroupDialogOpen = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setGroupNameFi(getLocalizedText(group.data.name, "fi"));
      setGroupNameEn(getLocalizedText(group.data.name, "en"));
      setGroupNameSv(getLocalizedText(group.data.name, "sv"));
      setGroupDescriptionFi(getLocalizedText(group.data.description, "fi"));
      setGroupDescriptionEn(getLocalizedText(group.data.description, "en"));
      setGroupDescriptionSv(getLocalizedText(group.data.description, "sv"));
    } else {
      setEditingGroup(null);
      setGroupNameFi("");
      setGroupNameEn("");
      setGroupNameSv("");
      setGroupDescriptionFi("");
      setGroupDescriptionEn("");
      setGroupDescriptionSv("");
    }
    setShowGroupDialog(true);
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingGroup) {
        await updateGroup(editingGroup.id, {
          data: {
            ...editingGroup.data,
            name: buildLocalizedValue({
              fi: groupNameFi,
              en: groupNameEn,
              sv: groupNameSv,
            }),
            description: buildLocalizedValue({
              fi: groupDescriptionFi,
              en: groupDescriptionEn,
              sv: groupDescriptionSv,
            }),
          },
        });
        toast({ title: "Success", description: "Group updated successfully" });
      } else {
        await createGroup({
          data: {
            name: {
              fi: groupNameFi,
              ...(groupNameEn ? { en: groupNameEn } : {}),
              ...(groupNameSv ? { sv: groupNameSv } : {}),
            },
            description: buildLocalizedValue({
              fi: groupDescriptionFi,
              en: groupDescriptionEn,
              sv: groupDescriptionSv,
            }),
          },
          ownerId: user.uid,
          order: groups.length,
        });
        toast({ title: "Success", description: "Group created successfully" });
      }
      setShowGroupDialog(false);
      void loadData();
    } catch (error) {
      logFirestoreError("Failed to save group", error);
      toast({
        title: "Error",
        description: "Failed to save group",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (
      !confirm(
        "This will delete the group and all its stacks and species. Continue?",
      )
    )
      return;

    try {
      await deleteGroup(groupId);
      toast({ title: "Success", description: "Group deleted successfully" });
      loadData();
    } catch (error) {
      logFirestoreError("Failed to delete group", error);
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  const handleToggleGroupVisibility = async (group: Group) => {
    const nextHidden = !group.isHidden;
    setGroups((prev) =>
      prev.map((item) =>
        item.id === group.id ? { ...item, isHidden: nextHidden } : item,
      ),
    );
    try {
      await updateGroup(group.id, { isHidden: nextHidden });
      toast({
        title: "Success",
        description: nextHidden
          ? "Group hidden from learners"
          : "Group is now public",
      });
    } catch (error) {
      logFirestoreError("Failed to toggle group visibility", error);
      setGroups((prev) =>
        prev.map((item) =>
          item.id === group.id ? { ...item, isHidden: group.isHidden } : item,
        ),
      );
      toast({
        title: "Error",
        description: "Failed to update group visibility",
        variant: "destructive",
      });
    }
  };

  const handleCreateGroupFromPinkka = async (sourceGroupId: string) => {
    if (!user) return;
    const sourceGroup = importedPinkkaGroups.find(
      (group) => String(group.groupId) === sourceGroupId,
    );

    if (!sourceGroup) {
      toast({
        title: "Error",
        description: "Selected Pinkka group was not found",
        variant: "destructive",
      });
      return;
    }

    try {
      await importPinkkaGroup(sourceGroup.groupId, user.uid);

      setShowPinkkaGroupSelector(false);
      toast({
        title: "Success",
        description: "Group imported from Pinkka",
      });
      void loadData();
    } catch (error) {
      logFirestoreError("Failed to create group from Pinkka import", error);
      toast({
        title: "Error",
        description: "Failed to create group from Pinkka import",
        variant: "destructive",
      });
    }
  };

  const handleRefreshPinkkaGroup = useCallback(
    async (group: Group) => {
      if (!user || typeof group.pinkkaRef?.groupId !== "number") {
        return;
      }

      setActivePinkkaRefresh({ type: "group", id: group.id });
      setPinkkaRefreshProgress(createEmptyPinkkaImportProgress());
      interruptRefreshRef.current = false;
      try {
        await refreshEditableGroupFromPinkka({
          groupId: group.id,
          ownerId: user.uid,
          onProgress: setPinkkaRefreshProgress,
          shouldInterrupt: () => interruptRefreshRef.current,
          includeSpeciesImages: true,
        });
        toast({
          title: "Success",
          description: "Group refreshed from Pinkka",
        });
        void loadData();
      } catch (error) {
        if (isPinkkaImportInterruptedError(error)) {
          toast({
            title: "Refresh interrupted",
            description: "The Pinkka refresh was interrupted.",
          });
        } else {
          logFirestoreError("Failed to refresh linked Pinkka group", error);
          toast({
            title: "Error",
            description: "Failed to refresh linked group from Pinkka",
            variant: "destructive",
          });
        }
      } finally {
        interruptRefreshRef.current = false;
        setActivePinkkaRefresh(null);
      }
    },
    [loadData, toast, user],
  );

  const handleRefreshPinkkaStack = useCallback(
    async (groupId: string, stack: Stack) => {
      if (!user || typeof stack.pinkkaRef?.stackId !== "number") {
        return;
      }

      setActivePinkkaRefresh({ type: "stack", id: stack.id });
      setPinkkaRefreshProgress(createEmptyPinkkaImportProgress());
      interruptRefreshRef.current = false;
      try {
        await refreshEditableStackFromPinkka({
          groupId,
          stackId: stack.id,
          ownerId: user.uid,
          onProgress: setPinkkaRefreshProgress,
          shouldInterrupt: () => interruptRefreshRef.current,
          includeSpeciesImages: true,
        });
        toast({
          title: "Success",
          description: "Stack refreshed from Pinkka",
        });
        void loadData();
      } catch (error) {
        if (isPinkkaImportInterruptedError(error)) {
          toast({
            title: "Refresh interrupted",
            description: "The Pinkka refresh was interrupted.",
          });
        } else {
          logFirestoreError("Failed to refresh linked Pinkka stack", error);
          toast({
            title: "Error",
            description: "Failed to refresh linked stack from Pinkka",
            variant: "destructive",
          });
        }
      } finally {
        interruptRefreshRef.current = false;
        setActivePinkkaRefresh(null);
      }
    },
    [loadData, toast, user],
  );

  const handleInterruptPinkkaRefresh = useCallback(() => {
    interruptRefreshRef.current = true;
  }, []);

  // Stack handlers
  const handleStackDialogOpen = (groupId: string, stack?: Stack) => {
    setSelectedGroupId(groupId);
    if (stack) {
      setEditingStack(stack);
      setStackNameFi(getLocalizedText(stack.data.name, "fi"));
      setStackNameEn(getLocalizedText(stack.data.name, "en"));
      setStackNameSv(getLocalizedText(stack.data.name, "sv"));
      setStackDescriptionFi(getLocalizedText(stack.data.description, "fi"));
      setStackDescriptionEn(getLocalizedText(stack.data.description, "en"));
      setStackDescriptionSv(getLocalizedText(stack.data.description, "sv"));
    } else {
      setEditingStack(null);
      setStackNameFi("");
      setStackNameEn("");
      setStackNameSv("");
      setStackDescriptionFi("");
      setStackDescriptionEn("");
      setStackDescriptionSv("");
    }
    setShowStackDialog(true);
  };

  const handleStackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingStack) {
        await updateStack(editingStack.id, {
          data: {
            ...editingStack.data,
            name: buildLocalizedValue({
              fi: stackNameFi,
              en: stackNameEn,
              sv: stackNameSv,
            }),
            description: buildLocalizedValue({
              fi: stackDescriptionFi,
              en: stackDescriptionEn,
              sv: stackDescriptionSv,
            }),
          },
        });
        toast({ title: "Success", description: "Stack updated successfully" });
      } else {
        const groupStacks = stacks[selectedGroupId] || [];
        await createStack(
          {
            data: {
              name: {
                fi: stackNameFi,
                ...(stackNameEn ? { en: stackNameEn } : {}),
                ...(stackNameSv ? { sv: stackNameSv } : {}),
              },
              description: buildLocalizedValue({
                fi: stackDescriptionFi,
                en: stackDescriptionEn,
                sv: stackDescriptionSv,
              }),
            },
            order: groupStacks.length,
            ownerId: user.uid,
          },
          [selectedGroupId],
        );
        toast({ title: "Success", description: "Stack created successfully" });
      }
      setShowStackDialog(false);
      loadData();
    } catch (error) {
      logFirestoreError("Failed to save stack", error);
      toast({
        title: "Error",
        description: "Failed to save stack",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStack = async (stackId: string) => {
    if (!confirm("This will delete the stack and all its species. Continue?"))
      return;

    try {
      await deleteStack(stackId);
      toast({ title: "Success", description: "Stack deleted successfully" });
      loadData();
    } catch (error) {
      logFirestoreError("Failed to delete stack", error);
      toast({
        title: "Error",
        description: "Failed to delete stack",
        variant: "destructive",
      });
    }
  };

  const handleToggleStackVisibility = async (groupId: string, stack: Stack) => {
    const nextHidden = !stack.isHidden;
    setStacks((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).map((item) =>
        item.id === stack.id ? { ...item, isHidden: nextHidden } : item,
      ),
    }));
    try {
      await updateStack(stack.id, { isHidden: nextHidden });
      toast({
        title: "Success",
        description: nextHidden
          ? "Stack hidden from learners"
          : "Stack is now public",
      });
    } catch (error) {
      logFirestoreError("Failed to toggle stack visibility", error);
      setStacks((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || []).map((item) =>
          item.id === stack.id ? { ...item, isHidden: stack.isHidden } : item,
        ),
      }));
      toast({
        title: "Error",
        description: "Failed to update stack visibility",
        variant: "destructive",
      });
    }
  };

  // Drag handlers for groups
  const handleGroupDragStart = (index: number) => {
    setDraggedGroupIndex(index);
  };

  const handleGroupDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedGroupIndex === null || draggedGroupIndex === index) return;

    const newGroups = [...groups];
    const draggedGroup = newGroups[draggedGroupIndex];
    newGroups.splice(draggedGroupIndex, 1);
    newGroups.splice(index, 0, draggedGroup);

    setDraggedGroupIndex(index);
    setGroups(newGroups);
  };

  const handleGroupDragEnd = async () => {
    if (draggedGroupIndex !== null) {
      const reorderedItems = groups.map((g, i) => ({ id: g.id, order: i }));
      await reorderItems("groups", reorderedItems);
      toast({ title: "Success", description: "Groups reordered successfully" });
    }
    setDraggedGroupIndex(null);
  };

  const handleStackDragStart = (groupId: string, index: number) => {
    setDraggedStackGroupId(groupId);
    setDraggedStackIndex(index);
  };

  const handleStackDragOver = (
    e: React.DragEvent,
    groupId: string,
    index: number,
  ) => {
    e.preventDefault();
    if (
      draggedStackIndex === null ||
      draggedStackGroupId !== groupId ||
      draggedStackIndex === index
    )
      return;

    const groupStacks = [...(stacks[groupId] || [])];
    const draggedStack = groupStacks[draggedStackIndex];
    groupStacks.splice(draggedStackIndex, 1);
    groupStacks.splice(index, 0, draggedStack);

    setStacks((prev) => ({ ...prev, [groupId]: groupStacks }));
    setDraggedStackIndex(index);
  };

  const handleStackDragEnd = async () => {
    if (draggedStackGroupId && draggedStackIndex !== null) {
      const reorderedStackIds = (stacks[draggedStackGroupId] || []).map(
        (stack) => stack.id,
      );
      await updateGroupStackOrder(draggedStackGroupId, reorderedStackIds);
      toast({ title: "Success", description: "Stacks reordered successfully" });
    }
    setDraggedStackGroupId(null);
    setDraggedStackIndex(null);
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="editor">
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
          <LoadingSpinner className="py-12" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="editor">
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Manage Groups and Stacks
              </h1>
              <p className="text-muted-foreground">Drag to order</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="mr-1 h-4 w-4" />
                  New Group
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleGroupDialogOpen()}>
                  Blank
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleOpenPinkkaGroupSelector}>
                  From Pinkka
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-6">
            {groups.map((group, index) => (
              <ManageGroupCard
                key={group.id}
                group={group}
                stacks={stacks[group.id] || []}
                index={index}
                onGroupDragStart={handleGroupDragStart}
                onGroupDragOver={handleGroupDragOver}
                onGroupDragEnd={handleGroupDragEnd}
                onAddStack={handleStackDialogOpen}
                onEditGroup={handleGroupDialogOpen}
                onDeleteGroup={handleDeleteGroup}
                onToggleGroupVisibility={handleToggleGroupVisibility}
                onEditStack={handleStackDialogOpen}
                onDeleteStack={handleDeleteStack}
                onToggleStackVisibility={handleToggleStackVisibility}
                onStackDragStart={handleStackDragStart}
                onStackDragOver={handleStackDragOver}
                onStackDragEnd={handleStackDragEnd}
                onRefreshPinkkaGroup={handleRefreshPinkkaGroup}
                refreshingPinkkaGroupId={
                  activePinkkaRefresh?.type === "group"
                    ? activePinkkaRefresh.id
                    : null
                }
                refreshingPinkkaStackId={
                  activePinkkaRefresh?.type === "stack"
                    ? activePinkkaRefresh.id
                    : null
                }
                onRefreshPinkkaStack={handleRefreshPinkkaStack}
              />
            ))}

            {groups.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">No groups created yet</p>
                  <Button onClick={() => handleGroupDialogOpen()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Group
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>

        <SelectFromListDialog
          open={showPinkkaGroupSelector}
          onOpenChange={setShowPinkkaGroupSelector}
          title="Create Group From Pinkka"
          description="Select an imported Pinkka group to create a new editable group with the same stacks and species."
          options={importedGroupOptions}
          confirmLabel="Create Group"
          emptyMessage="No imported Pinkka groups found. Import groups first from the Pinkka tab."
          listAriaLabel="Imported Pinkka groups"
          onConfirm={handleCreateGroupFromPinkka}
        />
        <PinkkaImportProgressDialog
          open={activePinkkaRefresh !== null}
          progress={pinkkaRefreshProgress}
          onInterrupt={handleInterruptPinkkaRefresh}
        />

        {/* Group Dialog */}
        <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? "Edit Group" : "Create New Group"}
              </DialogTitle>
              <DialogDescription>
                Groups help organize your stacks into categories
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleGroupSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groupNameFi">Group Name (FI) *</Label>
                <Input
                  id="groupNameFi"
                  value={groupNameFi}
                  onChange={(e) => setGroupNameFi(e.target.value)}
                  placeholder="e.g., Nisakkaat, Linnut, Kasvit"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupNameEn">Group Name (EN)</Label>
                <Input
                  id="groupNameEn"
                  value={groupNameEn}
                  onChange={(e) => setGroupNameEn(e.target.value)}
                  placeholder="e.g., Mammals, Birds, Plants"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupNameSv">Group Name (SV)</Label>
                <Input
                  id="groupNameSv"
                  value={groupNameSv}
                  onChange={(e) => setGroupNameSv(e.target.value)}
                  placeholder="e.g., Daggdjur, Faglar, Vaxter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupDescriptionFi">Description (FI)</Label>
                <Textarea
                  id="groupDescriptionFi"
                  value={groupDescriptionFi}
                  onChange={(e) => setGroupDescriptionFi(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupDescriptionEn">Description (EN)</Label>
                <Textarea
                  id="groupDescriptionEn"
                  value={groupDescriptionEn}
                  onChange={(e) => setGroupDescriptionEn(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupDescriptionSv">Description (SV)</Label>
                <Textarea
                  id="groupDescriptionSv"
                  value={groupDescriptionSv}
                  onChange={(e) => setGroupDescriptionSv(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingGroup ? "Update Group" : "Create Group"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowGroupDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Stack Dialog */}
        <Dialog open={showStackDialog} onOpenChange={setShowStackDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStack ? "Edit Stack" : "Create New Stack"}
              </DialogTitle>
              <DialogDescription>
                Stacks contain related species for learning
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleStackSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stackNameFi">Stack Name (FI) *</Label>
                <Input
                  id="stackNameFi"
                  value={stackNameFi}
                  onChange={(e) => setStackNameFi(e.target.value)}
                  placeholder="e.g., Pohjoisen nisakkaat"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stackNameEn">Stack Name (EN)</Label>
                <Input
                  id="stackNameEn"
                  value={stackNameEn}
                  onChange={(e) => setStackNameEn(e.target.value)}
                  placeholder="e.g., Nordic Mammals, Common Birds"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stackNameSv">Stack Name (SV)</Label>
                <Input
                  id="stackNameSv"
                  value={stackNameSv}
                  onChange={(e) => setStackNameSv(e.target.value)}
                  placeholder="e.g., Nordiska daggdjur"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stackDescriptionFi">Description (FI)</Label>
                <Textarea
                  id="stackDescriptionFi"
                  value={stackDescriptionFi}
                  onChange={(e) => setStackDescriptionFi(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stackDescriptionEn">Description (EN)</Label>
                <Textarea
                  id="stackDescriptionEn"
                  value={stackDescriptionEn}
                  onChange={(e) => setStackDescriptionEn(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stackDescriptionSv">Description (SV)</Label>
                <Textarea
                  id="stackDescriptionSv"
                  value={stackDescriptionSv}
                  onChange={(e) => setStackDescriptionSv(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingStack ? "Update Stack" : "Create Stack"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowStackDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
