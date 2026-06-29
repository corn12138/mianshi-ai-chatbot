const policies = {
  annual_leave:
    '年假政策：正式员工按司龄享有 5-15 天年假，请至少提前 3 个工作日在 HR 系统提交申请。',
  expense:
    '报销政策：差旅、办公采购和客户招待需要在 30 天内提交发票、事由和审批记录。',
  remote_work:
    '远程办公政策：每周最多 2 天远程办公，需要直属经理确认，并保持在线协作状态。',
  it_support:
    'IT 支持：VPN、邮箱、设备和账号问题可在 IT Service Desk 提单，紧急问题联系值班电话。',
  benefits:
    '福利政策：公司提供五险一金、年度体检、补充商业保险和节日福利。福利明细以 HR 系统中的个人权益页为准。',
  onboarding:
    '入职流程：新员工需完成合同签署、账号激活、设备领取、安全培训和导师沟通；试用期目标会在入职 7 个工作日内确认。',
  procurement:
    '采购政策：办公设备和软件订阅需先提交采购申请，金额超过 5000 元需要部门负责人和财务共同审批。',
  meeting_room:
    '会议室政策：会议室可在日历系统预订；超过 20 人或需要外部访客入场时，请提前 1 个工作日通知行政。',
  security_compliance:
    '安全合规：不得将内部资料上传到未批准的外部工具；涉及客户数据、合同或源代码时，需使用公司批准的系统和脱敏流程。',
  overtime:
    '加班与调休：加班需提前获得直属经理确认，调休应在 3 个月内使用，并在考勤系统中关联对应加班记录。',
} as const;

type PolicyTopic = keyof typeof policies;

export async function lookupHrPolicy(args: Record<string, unknown>) {
  // topic 必须来自受控枚举，避免 mock 业务查询返回不可预期内容。
  const topic = args.topic;
  if (typeof topic !== 'string' || !(topic in policies)) {
    throw new Error(`topic must be one of: ${Object.keys(policies).join(', ')}`);
  }

  // 当前 MVP 用静态数据模拟内部 HR/IT/行政/安全信息源。
  return policies[topic as PolicyTopic];
}
