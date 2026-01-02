import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Brain, GraduationCap, Sparkles } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 text-balance">
            Learn Species the Smart Way
          </h1>
          <p className="text-xl text-muted-foreground mb-8 text-balance max-w-2xl mx-auto">
            Master animal, plant, algae, and microbe identification through
            interactive flashcards and engaging quizzes
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/learn">Start Learning</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/signup">Sign Up Free</Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <BookOpen className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Organized Stacks</CardTitle>
              <CardDescription>
                Species grouped into themed stacks (pinkka) for structured
                learning
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Brain className="h-10 w-10 text-accent mb-2" />
              <CardTitle>Flashcards</CardTitle>
              <CardDescription>
                Study species with images and detailed information at your own
                pace
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <GraduationCap className="h-10 w-10 text-chart-3 mb-2" />
              <CardTitle>Interactive Quizzes</CardTitle>
              <CardDescription>
                Test your knowledge and track your progress over time
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Sparkles className="h-10 w-10 text-chart-4 mb-2" />
              <CardTitle>Create Content</CardTitle>
              <CardDescription>
                Editors can create and manage their own species collections
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="bg-card rounded-lg p-8 text-center border">
          <h2 className="text-3xl font-bold mb-4">
            Ready to become a species expert?
          </h2>
          <p className="text-muted-foreground mb-6">
            Join students and educators already using Pinkka to master species
            identification
          </p>
          <Button asChild size="lg">
            <Link href="/auth/signup">Get Started</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
