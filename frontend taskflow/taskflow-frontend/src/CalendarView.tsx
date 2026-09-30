import { CalendarDays, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Avatar, Empty } from "./components";
import { calendarRange, dateKey } from "./calendar";
import type { CalendarTask } from "./types";
import { priorities, statuses } from "./types";

const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export function CalendarView({
  month,
  tasks,
  onMonthChange,
  onTask,
  onReschedule,
}: {
  month: Date;
  tasks: CalendarTask[];
  onMonthChange: (month: Date) => void;
  onTask: (task: CalendarTask) => void;
  onReschedule: (task: CalendarTask, date: Date) => void;
}) {
  const { from } = calendarRange(month);
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(from);
    day.setDate(from.getDate() + index);
    return day;
  });
  const today = dateKey(new Date());
  const grouped = tasks.reduce<Record<string, CalendarTask[]>>((result, task) => {
    if (!task.dueDate) return result;
    const key = dateKey(new Date(task.dueDate));
    (result[key] ||= []).push(task);
    return result;
  }, {});

  const move = (amount: number) =>
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + amount, 1));

  return (
    <section className="calendar-panel" aria-label="Görev takvimi">
      <header className="calendar-header">
        <div>
          <span className="little-label">SON TARİHLER</span>
          <h2>
            {month.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
          </h2>
        </div>
        <div className="calendar-controls">
          <button className="button" onClick={() => onMonthChange(new Date())}>
            Bugün
          </button>
          <button className="icon-button" aria-label="Önceki ay" onClick={() => move(-1)}>
            <ChevronLeft size={18} />
          </button>
          <button className="icon-button" aria-label="Sonraki ay" onClick={() => move(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      </header>
      <div className="calendar-weekdays">
        {dayNames.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-grid">
        {days.map((day) => {
          const key = dateKey(day);
          const dayTasks = grouped[key] || [];
          const outside = day.getMonth() !== month.getMonth();
          return (
            <div
              className={`calendar-day ${outside ? "outside" : ""} ${key === today ? "today" : ""}`}
              key={key}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const task = tasks.find(
                  (item) => item.id === event.dataTransfer.getData("text/task-id"),
                );
                if (task && dateKey(new Date(task.dueDate!)) !== key)
                  onReschedule(task, day);
              }}
            >
              <span className="calendar-date">{day.getDate()}</span>
              <div className="calendar-events">
                {dayTasks.map((task) => (
                  <button
                    key={task.id}
                    className={`calendar-event priority-edge-${task.priority.toLowerCase()} ${task.status === "DONE" ? "is-done" : ""}`}
                    onClick={() => onTask(task)}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/task-id", task.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    title={`${task.title} · ${statuses.find((status) => status.value === task.status)?.label} · ${task.assignee?.name || "Atanmadı"}`}
                  >
                    <span className="calendar-event-title">{task.title}</span>
                    <span className="calendar-event-meta">
                      <span>{priorities[task.priority]}</span>
                      <span>{task.assignee?.name || "Atanmadı"}</span>
                      {task.assignee ? (
                        <Avatar name={task.assignee.name} small />
                      ) : (
                        <Users size={12} aria-label="Atanmadı" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {!tasks.length && (
        <div className="calendar-empty">
          <Empty
            icon={<CalendarDays size={25} />}
            title="Bu ay takvimde görev yok."
            description="Son tarih ve sorumlu eklenen görevler burada görünür."
          />
        </div>
      )}
    </section>
  );
}
