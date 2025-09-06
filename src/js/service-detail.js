// 服务详情页渲染逻辑
const SERVICES = {
  'cross-border': {
    name: '跨境电商运营',
    subtitle: 'Amazon / TikTok 全案、品牌增长与出海成功',
    desc: '我们提供从市场调研、选品、Listing 优化、广告投放到物流与售后全链路的出海运营服务，助力品牌提效与规模化增长。',
    features: [
      { title: '全案代运营', text: '站内站外整合投放，节省人力成本，快速起量。' },
      { title: 'Listing 与转化优化', text: '关键词布局、图片视频、转化率实验与 A/B 测试。' },
      { title: '品牌与合规', text: 'VAT、品牌备案、知识产权保护与安全合规。' },
      { title: '增长策略', text: '店铺诊断、竞品分析、ROI 优化与增长路线图。' }
    ],
    highlights: ['Amazon / TikTok / Shopify', '数据驱动增长', '闭环交付']
  },
  'miniapp': {
    name: '微信小程序开发',
    subtitle: '商城/预约/会员/扫码点餐/B2B 报价等行业模板与定制',
    desc: '从需求梳理、原型设计、UI 交互到前后端开发、部署与上线，全流程交付，源码可私有化部署，附完整技术文档与培训。',
    features: [
      { title: '模板 + 定制', text: '行业模板快速起步，按需定制高级能力。' },
      { title: '高可用架构', text: '账号体系、支付、消息推送、订单、数据报表完善。' },
      { title: '交付保障', text: '源码交付、CI/CD、测试报告、终身免费 BUG 修复。' },
      { title: '生态对接', text: '对接 ERP/CRM/仓储/支付等企业系统，开放 API。' }
    ],
    highlights: ['源码交付', '独立部署', '终身免费 BUG 修复']
  },
  'app-dev': {
    name: '移动 APP 定制',
    subtitle: '原生 + Flutter 混合技术栈，兼顾体验与效率',
    desc: '覆盖 iOS/Android 的企业级 APP 定制开发，包含原型、UI、接口文档与应用商店上架，全流程透明可控。',
    features: [
      { title: '性能优先', text: '关键路径原生实现，非关键功能 Flutter 快速覆盖。' },
      { title: '一致体验', text: '多端统一设计语言与交互规范。' },
      { title: '工程化交付', text: '规范化工程结构、自动化测试与持续集成。' },
      { title: '上线与增长', text: '商店上架、ASO、埋点分析与增长运营建议。' }
    ],
    highlights: ['原生 + Flutter', '商店上架', '工程化交付']
  },
  'devops': {
    name: '服务器部署与运维',
    subtitle: '云选型、环境搭建、监控、备份与故障应急',
    desc: '提供从云资源选型、自动化部署、监控告警到日常巡检与应急响应的全栈 DevOps 服务，保障业务稳定与成本优化。',
    features: [
      { title: '自动化部署', text: 'IaC + CI/CD，稳定可重复。' },
      { title: '可观测性', text: '监控、日志、链路追踪与容量规划。' },
      { title: '安全合规', text: '访问控制、备份演练、合规审计。' },
      { title: '服务等级', text: 'SLA/RPO/RTO 约定，月度报告。' }
    ],
    highlights: ['自动化', '可观测性', 'SLA']
  },
  'network': {
    name: '企业宽带与网络优化',
    subtitle: '专线/公网 IP/VPN/SD-WAN 跨境加速',
    desc: '面向多分支与跨境场景的企业网络组网与加速方案，保障高可用、低时延与可观测。',
    features: [
      { title: '高可用架构', text: '多出口冗余、BGP/静态路由、QoS。' },
      { title: '跨境加速', text: 'SD-WAN、智能选路、应用识别与策略。' },
      { title: '可运维', text: '可视化监控、告警、巡检与远程运维。' },
      { title: '服务保障', text: '4 小时内上门，≥ 99.9% 可用率。' }
    ],
    highlights: ['跨境加速', '高可用', '可观测']
  },
  'procurement': {
    name: '设备采购与安装',
    subtitle: '从选型、配送、组网到资产管理与回收的一体化服务',
    desc: '标准化设备选型与安装交付流程，覆盖品牌机、服务器、打印机、扫码枪、监控等全品类设备的采购与安装。',
    features: [
      { title: '全流程交付', text: '选型→配送→组网→资产标签→报废回收。' },
      { title: '品牌与保障', text: '主流品牌正品渠道，质保可追溯。' },
      { title: '成本优化', text: '批采议价、生命周期总成本优化。' },
      { title: '统一运维', text: '统一台账、远程巡检与现场服务。' }
    ],
    highlights: ['正品保障', '全流程', '统一运维']
  },
  'security': {
    name: '网络安全与合规',
    subtitle: '防火墙/上网行为/入侵检测/漏洞扫描，等保 2.0 合规',
    desc: '提供安全架构设计、攻防演练与合规咨询，覆盖渗透测试、漏洞扫描、安全培训等关键能力。',
    features: [
      { title: '边界与访问控制', text: '防火墙、VPN、零信任访问。' },
      { title: '威胁检测与响应', text: 'IDS/IPS、EDR、应急响应。' },
      { title: '合规与审计', text: '等保 2.0、日志留存、合规评估。' },
      { title: '安全运营', text: '持续监控、漏洞修复与安全培训。' }
    ],
    highlights: ['等保 2.0', '渗透测试', '安全培训']
  },
  'custom-dev': {
    name: '定制软件开发',
    subtitle: 'ERP/OA/CRM/进销存/工单/数据中台，开放对接主流系统',
    desc: '为企业提供端到端定制开发服务，结合业务流程进行系统设计与实施，对接金蝶、用友、SAP、Shopify、Amazon SP-API 等。',
    features: [
      { title: '业务建模', text: '以业务为核心的领域建模与流程编排。' },
      { title: '稳定与扩展', text: '分层架构、模块化、可扩展与高可用。' },
      { title: '数据与集成', text: '主数据治理、对接外部系统与数据中台。' },
      { title: '交付与运营', text: '完善文档、培训与运维支持。' }
    ],
    highlights: ['对接主流系统', '可扩展', '完善文档']
  },
  'web-dev': {
    name: '网站开发',
    subtitle: '现代化前端技术栈与工程化实践，追求高性能与高可维护',
    desc: '基于 HTML5/CSS3/JavaScript 与工程化工具链，构建响应式、可扩展、性能优秀的网站应用。',
    features: [
      { title: '现代技术栈', text: '模块化、组件化与按需加载，提升开发效率。' },
      { title: '工程化', text: 'Vite/Tailwind/ESLint/Prettier/CI/CD 全流程。' },
      { title: '可维护性', text: '规范化目录结构与代码规范，长期可维护。' },
      { title: '可访问性', text: '遵循 a11y 最佳实践，提升用户可达性。' }
    ],
    highlights: ['现代技术栈', '工程化', '高可维护']
  },
  'uiux': {
    name: 'UI/UX设计',
    subtitle: '以用户为中心的体验设计，从研究到视觉与可用性验证',
    desc: '通过用户研究、信息架构、交互原型与视觉设计，打造一致、易用且有品牌辨识度的用户体验。',
    features: [
      { title: '用户研究', text: '洞察用户动机与任务场景，识别关键路径。' },
      { title: '信息架构', text: '层级清晰、导航高效，降低认知负担。' },
      { title: '原型验证', text: '低/中/高保真原型与可用性测试闭环。' },
      { title: '设计系统', text: '组件库与样式指南，保障一致性。' }
    ],
    highlights: ['研究驱动', '原型验证', '设计系统']
  },
  'responsive': {
    name: '响应式设计',
    subtitle: '多端一致体验，移动优先与渐进增强',
    desc: '采用移动优先与响应式布局策略，保障从手机到桌面的大范围设备适配与一致体验。',
    features: [
      { title: '移动优先', text: '优先考虑小屏体验与关键任务流程。' },
      { title: '组件自适应', text: '断点与弹性布局，组件级适配策略。' },
      { title: '触摸友好', text: '手势与可触达目标尺寸优化。' },
      { title: '性能优化', text: '图片资源与渲染路径优化，确保流畅。' }
    ],
    highlights: ['多端适配', '移动优先', '体验一致']
  },
  'perf-opt': {
    name: '性能优化',
    subtitle: '以用户感知为核心，从加载到交互全面优化',
    desc: '围绕核心性能指标（LCP、FID、CLS）进行系统性优化，覆盖代码、资源、缓存与网络层。',
    features: [
      { title: '代码与资源', text: '按需加载、Tree Shaking、压缩与去抖/节流。' },
      { title: '图片优化', text: '自适应尺寸、WebP/AVIF、懒加载。' },
      { title: '缓存策略', text: 'HTTP 缓存、Service Worker、CDN。' },
      { title: '监控与迭代', text: '性能采集与指标看板，持续优化。' }
    ],
    highlights: ['LCP/FID/CLS', '缓存与CDN', '持续优化']
  },
  'seo': {
    name: 'SEO优化',
    subtitle: '抓取友好、内容可见、结构化数据与站内外协同',
    desc: '从站点结构、语义化标记、Meta/OG/Twitter、站点地图到结构化数据，系统提升搜索可见性。',
    features: [
      { title: '站内优化', text: '语义化、标题/描述、关键词与站点结构。' },
      { title: '内容策略', text: '主题聚合、长尾关键词、内链优化。' },
      { title: '结构化数据', text: 'JSON-LD 标注，丰富搜索结果展现。' },
      { title: '技术协同', text: '性能、可访问性与移动端优化协同。' }
    ],
    highlights: ['结构化数据', '主题聚合', '技术SEO']
  },
  'consulting': {
    name: '技术咨询',
    subtitle: '技术选型、架构设计、代码审查与最佳实践落地',
    desc: '针对不同业务阶段提供技术顾问服务，帮助团队在选型、架构、工程化与安全等方面做出稳健决策。',
    features: [
      { title: '选型与方案', text: '结合业务约束给出可落地方案与路径。' },
      { title: '架构与治理', text: '分层解耦、稳定与可扩展、成本优化。' },
      { title: '代码与质量', text: '代码规范、测试策略与Review机制。' },
      { title: '安全与合规', text: '安全基线、流程与工具链整合。' }
    ],
    highlights: ['架构设计', '工程治理', '安全基线']
  }
};

function qs(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function renderService(key) {
  const data = SERVICES[key];
  const nameEl = document.getElementById('service-name');
  const bcEl = document.getElementById('breadcrumb-name');
  const subEl = document.getElementById('service-subtitle');
  const descEl = document.getElementById('service-desc');
  const featEl = document.getElementById('service-features');
  const hiEl = document.getElementById('service-highlights');

  if (!data) {
    document.title = '服务未找到 - 现代化网站';
    nameEl.textContent = '服务未找到';
    subEl.textContent = '抱歉，未找到对应的服务，请返回服务页重试。';
    descEl.textContent = '可能的原因：链接已过期、服务已下线或参数错误。';
    return;
  }

  document.title = `${data.name} - 服务详情`;
  updateMeta(data);
  nameEl.textContent = data.name;
  bcEl.textContent = data.name;
  subEl.textContent = data.subtitle;
  descEl.textContent = data.desc;

  // features
  featEl.innerHTML = '';
  data.features.forEach(f => {
    const card = document.createElement('div');
    card.className = 'card card-hover';
    card.innerHTML = `<div class="card-body">
      <div class="card-title">${f.title}</div>
      <div class="text-gray-600 leading-7">${f.text}</div>
    </div>`;
    featEl.appendChild(card);
  });

  // highlights
  hiEl.innerHTML = '';
  data.highlights.forEach(h => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="badge badge-primary">${h}</span>`;
    hiEl.appendChild(li);
  });
}

function updateMeta(data) {
  try {
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', data.desc);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${data.name} - 服务详情`);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', data.desc);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', window.location.href);
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  const key = qs('k');
  renderService(key || 'cross-border');
});
