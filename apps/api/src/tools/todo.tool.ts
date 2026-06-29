export async function createTodo(args: Record<string, unknown>) {
  const title = args.title;
  const dueDate = args.dueDate;

  if (typeof title !== 'string' || !title.trim()) {
    throw new Error('title is required');
  }

  if (dueDate !== undefined && typeof dueDate !== 'string') {
    throw new Error('dueDate must be a string when provided');
  }

  const todoId = `todo_${crypto.randomUUID().slice(0, 8)}`;
  return `已创建待办 ${todoId}：${title.trim()}${dueDate ? `，截止时间：${dueDate}` : ''}。`;
}
