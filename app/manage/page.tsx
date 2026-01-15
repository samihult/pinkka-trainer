"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { logFirestoreError } from "@/lib/utils";
import {
  getGroups,
  getStacks,
  createGroup,
  createStack,
  updateGroup,
  updateStack,
  deleteGroup,
  deleteStack,
  reorderItems,
  updateGroupStackOrder,
} from "@/lib/firebase/firestore-helpers";
import type { Group, Stack } from "@/lib/types";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";
import {
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  BookOpen,
  GripVertical,
} from "lucide-react";
import Link from "next/link";

export default function ManagePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [groups, setGroups] = useState<Group[]>([]);
  const [stacks, setStacks] = useState<{ [key: string]: Stack[] }>({});
  const [loading, setLoading] = useState(true);

  // Group dialog state
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");

  // Stack dialog state
  const [showStackDialog, setShowStackDialog] = useState(false);
  const [editingStack, setEditingStack] = useState<Stack | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [stackName, setStackName] = useState("");
  const [stackDescription, setStackDescription] = useState("");

  const [draggedGroupIndex, setDraggedGroupIndex] = useState<number | null>(
    null,
  );
  const [draggedStackIndex, setDraggedStackIndex] = useState<number | null>(
    null,
  );
  const [draggedStackGroupId, setDraggedStackGroupId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const groupsData = await getGroups(user.uid);
      setGroups(groupsData);

      // Load stacks for each group
      const stacksData: { [key: string]: Stack[] } = {};
      for (const group of groupsData) {
        stacksData[group.id] = await getStacks(group.id, user.uid);
      }
      setStacks(stacksData);
    } catch (error) {
      logFirestoreError("Failed to load groups/stacks", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Group handlers
  const handleGroupDialogOpen = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setGroupName(getLocalizedText(group.data.name, "fi"));
      setGroupDescription(getLocalizedText(group.data.description, "fi"));
    } else {
      setEditingGroup(null);
      setGroupName("");
      setGroupDescription("");
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
            name: { ...editingGroup.data.name, fi: groupName },
            description: groupDescription
              ? {
                  ...(editingGroup.data.description || {}),
                  fi: groupDescription,
                }
              : undefined,
          },
        });
        toast({ title: "Success", description: "Group updated successfully" });
      } else {
        await createGroup({
          data: {
            id: Date.now(),
            name: { fi: groupName },
            description: groupDescription
              ? { fi: groupDescription }
              : undefined,
            hideScientific: false,
            hideVernacular: false,
            published: true,
            entityType: "pinkka",
          },
          stackIds: [],
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

  // Stack handlers
  const handleStackDialogOpen = (groupId: string, stack?: Stack) => {
    setSelectedGroupId(groupId);
    if (stack) {
      setEditingStack(stack);
      setStackName(getLocalizedText(stack.data.name, "fi"));
      setStackDescription(getLocalizedText(stack.data.description, "fi"));
    } else {
      setEditingStack(null);
      setStackName("");
      setStackDescription("");
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
            name: { ...editingStack.data.name, fi: stackName },
            description: stackDescription
              ? {
                  ...(editingStack.data.description || {}),
                  fi: stackDescription,
                }
              : undefined,
          },
        });
        toast({ title: "Success", description: "Stack updated successfully" });
      } else {
        const groupStacks = stacks[selectedGroupId] || [];
        await createStack(
          {
            data: {
              id: Date.now(),
              name: { fi: stackName },
              orderNo: groupStacks.length,
              description: stackDescription
                ? { fi: stackDescription }
                : undefined,
              entityType: "subpinkka",
            },
            speciesIds: [],
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
          <Navbar />
          <LoadingSpinner className="py-12" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="editor">
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <Navbar />

        <main className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Manage Content</h1>
              <p className="text-muted-foreground">
                Create and organize your species collections
              </p>
            </div>

            <Button onClick={() => handleGroupDialogOpen()}>
              <Plus className="mr-2 h-4 w-4" />
              New Group
            </Button>
          </div>

          <div className="space-y-6">
            {groups.map((group, index) => (
              <Card
                key={group.id}
                draggable
                onDragStart={() => handleGroupDragStart(index)}
                onDragOver={(e) => handleGroupDragOver(e, index)}
                onDragEnd={handleGroupDragEnd}
                className="cursor-move gap-3"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3 flex-1">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <FolderOpen className="h-5 w-5" />
                          {getLocalizedText(group.data.name, "fi")}
                        </CardTitle>
                        {getLocalizedText(group.data.description, "fi") && (
                          <CardDescription className="mt-1">
                            {getLocalizedText(group.data.description, "fi")}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStackDialogOpen(group.id)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Stack
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGroupDialogOpen(group)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="columns-1 gap-x-5 sm:columns-2 lg:columns-3">
                    {(stacks[group.id] || []).map((stack, index) => (
                      <Card
                        key={stack.id}
                        draggable
                        onDragStart={() => handleStackDragStart(group.id, index)}
                        onDragOver={(e) => handleStackDragOver(e, group.id, index)}
                        onDragEnd={handleStackDragEnd}
                        className="mb-3 break-inside-avoid transition-shadow shadow-xs hover:shadow-sm rounded-xs"
                      >
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            {getLocalizedText(stack.data.name, "fi")}
                          </CardTitle>
                          {/*{getLocalizedText(stack.data.description, "fi") && (*/}
                          {/*  <CardDescription className="text-sm">*/}
                          {/*    {getLocalizedText(stack.data.description, "fi")}*/}
                          {/*  </CardDescription>*/}
                          {/*)}*/}
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/manage/species/${stack.id}`}>
                              Manage Species
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleStackDialogOpen(group.id, stack)
                            }
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteStack(stack.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}

                    {(stacks[group.id] || []).length === 0 && (
                      <div className="col-span-full text-center py-8 text-muted-foreground">
                        <p className="mb-2">No stacks in this group yet</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStackDialogOpen(group.id)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add First Stack
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
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
                <Label htmlFor="groupName">Group Name *</Label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Mammals, Birds, Plants"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupDescription">Description</Label>
                <Textarea
                  id="groupDescription"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
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
                Stacks (pinkka) contain related species for learning
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleStackSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stackName">Stack Name *</Label>
                <Input
                  id="stackName"
                  value={stackName}
                  onChange={(e) => setStackName(e.target.value)}
                  placeholder="e.g., Nordic Mammals, Common Birds"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stackDescription">Description</Label>
                <Textarea
                  id="stackDescription"
                  value={stackDescription}
                  onChange={(e) => setStackDescription(e.target.value)}
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
