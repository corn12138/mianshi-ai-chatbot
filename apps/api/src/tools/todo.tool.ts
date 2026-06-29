export async function createTodo(args: Record<string, unknown>) {
  // 工具参数来自模型或规则路由，必须先做运行时校验。
  const title = args.title;
  const dueDate = args.dueDate;

  if (typeof title !== 'string' || !title.trim()) {
    throw new Error('title is required');
  }

  if (dueDate !== undefined && typeof dueDate !== 'string') {
    throw new Error('dueDate must be a string when provided');
  }

  // 不落库，只生成 mock ID 证明“创建待办”动作已经执行。
  const todoId = `todo_${crypto.randomUUID().slice(0, 8)}`;
  return `已创建待办 ${todoId}：${title.trim()}${dueDate ? `，截止时间：${dueDate}` : ''}。`;
}
