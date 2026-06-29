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

const topicAliases: Record<PolicyTopic, string[]> = {
  annual_leave: ['annual_leave', '年假', '年休', '休假', '假期', '请假', 'annual leave', 'leave policy'],
  expense: ['expense', '报销', '报账', '发票', '费用', '差旅', '垫付', 'reimburse', 'reimbursement'],
  remote_work: ['remote_work', '远程', '居家', '在家办公', '远程办公', 'remote', 'wfh', 'work from home'],
  it_support: ['it_support', 'vpn', '邮箱', '电脑', 'it', '账号', '密码', '网络', '设备', '登录', 'service desk'],
  benefits: ['benefits', '福利', '五险', '社保', '公积金', '体检', '商业保险', 'benefit'],
  onboarding: ['onboarding', '入职', '新人', '新员工', '试用期', '转正', '导师'],
  procurement: ['procurement', '采购', '设备申请', '办公用品', '软件订阅', '供应商', 'purchase'],
  meeting_room: ['meeting_room', '会议室', '访客', '会议预订', '预约会议', '日历', 'meeting room', 'visitor'],
  security_compliance: ['security_compliance', '安全', '合规', '客户数据', '源代码', '脱敏', '保密', '权限', 'security'],
  overtime: ['overtime', '加班', '调休', '补休', '考勤'],
};

export async function lookupHrPolicy(args: Record<string, unknown>) {
  // topic 来自受控枚举时直接查询；query 来自自然语言时先做别名归一。
  const topic = typeof args.topic === 'string' ? args.topic.trim() : undefined;
  const query = typeof args.query === 'string' ? args.query.trim() : undefined;
  const normalizedTopic = resolvePolicyTopic(topic || query);

  if (normalizedTopic) {
    return policies[normalizedTopic];
  }

  if (query) {
    return `暂未找到“${query}”的精确 mock 政策。当前可查询主题：${Object.keys(policies).join(', ')}。`;
  }

  throw new Error(`topic must be one of: ${Object.keys(policies).join(', ')}`);
}

function resolvePolicyTopic(raw: string | undefined): PolicyTopic | undefined {
  if (!raw) return undefined;

  const text = raw.toLowerCase();
  if (text in policies) return text as PolicyTopic;

  return (Object.entries(topicAliases) as Array<[PolicyTopic, string[]]>).find(([, aliases]) =>
    aliases.some((alias) => text.includes(alias.toLowerCase())),
  )?.[0];
}
