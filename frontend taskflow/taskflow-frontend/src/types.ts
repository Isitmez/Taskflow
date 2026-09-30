export type Role = "OWNER" | "ADMIN" | "MEMBER";
export type Status = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type Recurrence = "DAILY" | "WEEKLY" | "MONTHLY";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  userId: string;
  role: Role;
  user: User;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED";
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  createdById: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  labels?: { label: Label }[];
  archivedAt?: string | null;
  deletedAt?: string | null;
  recurrence?: Recurrence | null;
  recurrenceEnd?: string | null;
  parentId?: string | null;
  subtasks?: Task[];
}

export interface CalendarTask extends Task {
  assignee: Pick<User, "id" | "name" | "email"> | null;
}

export interface Label {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  uploaderId: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploader?: Pick<User, "id" | "name" | "email">;
}

export interface Activity {
  id: string;
  taskId: string | null;
  actorId: string;
  action: string;
  details: string | null;
  createdAt: string;
  actor: Pick<User, "id" | "name" | "email">;
}

export interface Notification {
  id: string;
  taskId: string | null;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  task:
    | (Pick<Task, "id" | "title" | "projectId"> & {
        project: { workspaceId: string };
      })
    | null;
}

export interface DashboardStats {
  total: number;
  overdue: number;
  unassigned: number;
  byStatus: Partial<Record<Status, number>>;
  byPriority: Partial<Record<Priority, number>>;
  byAssignee: {
    user: Pick<User, "id" | "name" | "email">;
    total: number;
    completed: number;
  }[];
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const statuses: {
  value: Status;
  label: string;
  color: string;
}[] = [
  { value: "TODO", label: "Yapılacak", color: "#93948f" },
  { value: "IN_PROGRESS", label: "Devam ediyor", color: "#d38946" },
  { value: "IN_REVIEW", label: "İncelemede", color: "#8f7db1" },
  { value: "DONE", label: "Tamamlandı", color: "#648972" },
];

export const priorities: Record<Priority, string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

export const roles: Record<Role, string> = {
  OWNER: "Sahip",
  ADMIN: "Yönetici",
  MEMBER: "Üye",
};

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toLocaleUpperCase("tr");

export const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });

export const inputDate = (value: string | Date) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
