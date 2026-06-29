const policies = {
  annual_leave:
    '年假政策：正式员工按司龄享有 5-15 天年假，请至少提前 3 个工作日在 HR 系统提交申请。',
  expense:
    '报销政策：差旅、办公采购和客户招待需要在 30 天内提交发票、事由和审批记录。',
  remote_work:
    '远程办公政策：每周最多 2 天远程办公，需要直属经理确认，并保持在线协作状态。',
  it_support:
    'IT 支持：VPN、邮箱、设备和账号问题可在 IT Service Desk 提单，紧急问题联系值班电话。',
} as const;

type PolicyTopic = keyof typeof policies;

export async function lookupHrPolicy(args: Record<string, unknown>) {
  const topic = args.topic;
  if (typeof topic !== 'string' || !(topic in policies)) {
    throw new Error('topic must be annual_leave, expense, remote_work, or it_support');
  }

  return policies[topic as PolicyTopic];
}
