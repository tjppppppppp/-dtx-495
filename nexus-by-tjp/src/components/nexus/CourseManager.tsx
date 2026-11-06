import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCourse, deleteCourse, listCourses } from "@/lib/courses.functions";

export function useCourses() {
  const fetchCourses = useServerFn(listCourses);
  return useQuery({ queryKey: ["courses"], queryFn: () => fetchCourses() });
}

export function CourseManager({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createCourse);
  const deleteFn = useServerFn(deleteCourse);
  const { data: courses = [], isLoading } = useCourses();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [semester, setSemester] = useState("");
  const [instructor, setInstructor] = useState("");

  const create = useMutation({
    mutationFn: () => createFn({ data: { name, code, semester: semester || undefined, instructor: instructor || undefined } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setOpen(false);
      setName(""); setCode(""); setSemester(""); setInstructor("");
      toast.success("Course created");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create course"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course removed");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not remove course"),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Plus />Add a course
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New course</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="course-code">Course code</Label>
              <Input id="course-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="ECE 340" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="course-name">Course name</Label>
              <Input id="course-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Semiconductor Electronics" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="course-semester">Semester</Label>
                <Input id="course-semester" value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="Fall 2026" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="course-instructor">Instructor (optional)</Label>
                <Input id="course-instructor" value={instructor} onChange={(e) => setInstructor(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create course"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading && <p className="text-xs text-muted-foreground">Loading courses…</p>}
      {!isLoading && courses.length === 0 && (
        <p className="text-xs text-muted-foreground">No courses yet. Add your first course to attach sources and sessions.</p>
      )}
      <ul className="space-y-1.5">
        {courses.map((c) => (
          <li key={c.id} className="group flex items-start justify-between gap-2 border-l-2 border-primary/50 pl-2 text-xs">
            <div className="min-w-0">
              <div className="font-mono font-medium">{c.code}</div>
              {!compact && <div className="truncate text-muted-foreground">{c.name}</div>}
              {c.semester && <div className="text-[10px] text-muted-foreground">{c.semester}</div>}
            </div>
            <button
              type="button"
              aria-label={`Remove ${c.code}`}
              className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              onClick={() => remove.mutate(c.id)}
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
