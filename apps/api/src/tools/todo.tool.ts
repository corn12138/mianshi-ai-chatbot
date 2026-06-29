const MAX_TITLE_LENGTH = 120;
const MAX_DUE_DATE_LENGTH = 40;

export async function createTodo(args: Record<string, unknown>) {
  // 工具参数来自模型或规则路由，必须先做运行时校验。
  const title = args.title;
  const dueDate = args.dueDate;

  if (typeof title !== 'string' || !title.trim()) {
    throw new Error('title is required');
  }

  const normalizedTitle = normalizeTitle(title);
  if (normalizedTitle.length > MAX_TITLE_LENGTH) {
    throw new Error(`title must be at most ${MAX_TITLE_LENGTH} characters`);
  }

  if (dueDate !== undefined && typeof dueDate !== 'string') {
    throw new Error('dueDate must be a string when provided');
  }

  const normalizedDueDate = typeof dueDate === 'string' ? normalizeDueDate(dueDate) : undefined;
  if (normalizedDueDate && normalizedDueDate.length > MAX_DUE_DATE_LENGTH) {
    throw new Error(`dueDate must be at most ${MAX_DUE_DATE_LENGTH} characters`);
  }

  // 不落库，只生成 mock ID 证明“创建待办”动作已经执行。
  const todoId = `todo_${crypto.randomUUID().slice(0, 8)}`;
  return `已创建待办 ${todoId}：${normalizedTitle}${normalizedDueDate ? `，截止时间：${normalizedDueDate}` : ''}。`;
}

function normalizeTitle(title: string) {
  return title.replace(/\s+/g, ' ').trim();
}

function normalizeDueDate(dueDate: string) {
  return dueDate.replace(/\s+/g, '').trim();
}
