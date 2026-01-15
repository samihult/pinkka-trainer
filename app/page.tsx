import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Brain, ChartSpline, GraduationCap } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 text-balance">
            Pinkka trainer
          </h1>
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
            <CardFooter>
              <Button asChild size="lg">
                <Link href="/learn">Start Learning</Link>
              </Button>
            </CardFooter>
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
            <CardFooter>
              <Button asChild size="lg">
                <Link href="/learn">Start Learning</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <GraduationCap className="h-10 w-10 text-chart-3 mb-2" />
              <CardTitle>Interactive Quizzes</CardTitle>
              <CardDescription>
                Test your knowledge and track your progress over time
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild size="lg">
                <Link href="/learn">Start Learning</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <ChartSpline className="h-10 w-10 text-chart-4 mb-2" />
              <CardTitle>Plan and track</CardTitle>
              <CardDescription>
                Register to plan and track your progress
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild variant="outline" size="lg">
                <Link href="/auth/signup">Sign up</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
