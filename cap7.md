---
id: 7
title: 可观测性平台
badge: 重要能力
badge-class: p1
status: S1-重要
status-class: active
subtitle: 跨云统一监控体系 — Metrics / Logs / Traces 三大支柱 + AIOps 智能告警，消灭监控盲区
---

## 基本信息
| 能力域定位 | 构建远景能源跨阿里云/AWS/GCP/私有云的统一可观测性平台，实现基础设施、应用、业务三层监控的全覆盖，从"被动救火"转向"主动预防" |
| 对应痛点 | **#6 监控可观测性不足**（S1-重要）— 监控工具碎片化、告警风暴、MTTR > 45min |
| 上下游关系 | **上游依赖：** 能力四（IaC）提供一致性部署基础；能力一（网络）确保数据采集的网络可达<br>**下游影响：** 可观测性数据服务于 #6 容灾（故障检测）、#5 成本（资源利用率分析）、#3 安全（安全事件检测） |
| 能力稀缺度 | **中** — SRE/可观测性方向人才供给增多，但跨多云统一建设的经验较少 |
| 岗位权重 | 八大能力域中权重 8%，是运维效率提升的核心杠杆 |

## 核心职责详解 {hyp}

### 7.1 — 可观测性架构设计
设计统一的可观测性架构，覆盖 Metrics（指标）、Logs（日志）、Traces（链路追踪）三大支柱
✅ | 能够设计完整的可观测性技术栈：<br>**Metrics:** Prometheus/Thanos 或 VictoriaMetrics<br>**Logs:** ELK/Loki + FluentBit<br>**Traces:** Jaeger/Tempo + OpenTelemetry<br>**Dashboard:** Grafana<br>理解三大支柱的关联分析方法 | → 架构设计<br>→ 技术选型
❌ | 只关注单一支柱（如只做 Metrics 不做 Traces），或者各支柱工具不互通 | → 架构培训
→ | 从 OpenTelemetry + Grafana Stack 开始，统一数据采集和展示 |

### 7.2 — 跨云数据采集与汇聚
设计跨阿里云/AWS/GCP/私有云的监控数据统一采集方案，解决各云原生监控工具的数据孤岛问题
✅ | 能够将各云原生指标（CloudWatch Metrics / 阿里云云监控 / Cloud Monitoring）统一导入到 Prometheus/VictoriaMetrics；使用 OpenTelemetry Collector 实现统一数据采集管道 | → 采集方案<br>→ 数据管道
❌ | 各云用各自的监控工具，没有统一视图；跨云关联分析完全做不到 | → 数据汇聚
→ | 先部署 OpenTelemetry Collector 作为统一采集代理，再逐步接入各云 |

### 7.3 — 告警治理与 On-Call
设计分级告警策略，消除告警风暴，建立有效的 On-Call 轮值和事件升级机制
✅ | 有告警治理经验：告警分级（P0-P3）、告警去重和关联、告警路由（PagerDuty/OpsGenie）、On-Call 轮值设计、升级策略；能够将告警数量减少 50%+ 同时不漏报 | → 告警策略<br>→ On-Call 设计
❌ | 告警规则大量、无分级、频繁误报，运维人员告警疲劳；没有正式的 On-Call 机制 | → 告警治理
→ | 先做告警审计（删除无效告警），再建立分级和路由策略 |

### 7.4 — SLO/SLI 框架
为核心服务定义 SLO（Service Level Objective）和 SLI（Service Level Indicator），用数据驱动可靠性决策
✅ | 有 SLO/SLI 框架设计经验；能够定义有意义的 SLI（如可用性、延迟 P99、错误率）；理解 Error Budget 概念和用法；SLO Dashboard 对接告警 | → SLO 框架<br>→ Error Budget
❌ | 没有明确的 SLO，可靠性目标模糊（"尽量别挂"）；不了解 Error Budget 概念 | → SRE 培训
→ | 从最核心的 3-5 个服务开始定义 SLO，逐步扩展 |

### 7.5 — AIOps 与异常检测
引入 AIOps 能力，利用机器学习进行异常检测、根因定位和容量预测
✅ | 了解 AIOps 的核心场景（异常检测、事件关联、根因分析、容量预测）；使用过相关工具（Datadog Watchdog / 阿里云 ARMS / Moogsoft / BigPanda）；对 AIOps 的能力和局限性有清醒认知 | → AIOps 方案
❌ | 认为 AIOps 可以完全替代人工监控，或者完全不了解 AIOps 的概念 | → AIOps 评估
→ | 从基础的阈值告警升级到动态基线告警，逐步引入 ML 能力 |

### 7.6 — 事件管理与复盘
建立标准化的事件管理流程：事件 → 分类 → 分派 → 处理 → 复盘 → 改进
✅ | 有完整的事件管理流程设计经验（ITIL Incident Management 或 SRE Incident Response）；有 blameless postmortem 文化推动经验；能够从事件中提取系统性改进 | → 事件流程<br>→ 复盘模板
❌ | 事件处理靠口头通知和临时协调，没有标准化流程；事后不做复盘 | → 流程建设
→ | 从建立事件 Slack Channel / 钉钉群 + 复盘模板开始 |

## 硬技能要求 {disc}
| Metrics 栈 | Prometheus（PromQL、Recording Rules、Alerting Rules）、Thanos/Cortex/VictoriaMetrics（长期存储+多集群）、Grafana Dashboard 设计 |
| Logs 栈 | Elasticsearch/Loki（LogQL）、FluentBit/Fluentd/Vector（数据采集管道）、Kibana/Grafana（日志分析） |
| Traces 栈 | OpenTelemetry（SDK + Collector 配置）、Jaeger/Tempo/Zipkin（链路存储和查询）、服务拓扑图分析 |
| 告警平台 | Alertmanager / PagerDuty / OpsGenie / 阿里云云监控告警配置；告警路由和抑制规则 |
| 云原生监控 | 阿里云（云监控 + ARMS + SLS）、AWS（CloudWatch + X-Ray + OpenSearch）、GCP（Cloud Monitoring + Cloud Trace + Cloud Logging） |
| K8s 监控 | kube-state-metrics、node_exporter、cAdvisor；K8s Dashboard 设计；Pod/Node/Cluster 三层监控 |
| 自动化 | 监控配置即代码（Terraform + Grafana Provider / Jsonnet）；告警规则版本管理 |

## 评估维度 — 面试考察要点 {hyp}

### E1 — 大规模监控经验
你管理过的最大规模的监控系统是什么样的？（多少节点、多少指标、数据量）
✅ | 管理过 1000+ 节点 / 百万级时间序列的监控系统；处理过 Prometheus 高基数（high cardinality）问题；有 Thanos/VictoriaMetrics 长期存储经验 | → 规模经验
❌ | 监控规模小（< 100 节点），没有遇到过大规模带来的挑战（存储、查询性能、高可用） | → 规模不足
→ | 规模经验可以在工作中积累，关键是架构设计的前瞻性 |

### E2 — 告警治理
你如何将告警数量减少 50% 同时不增加漏报？
✅ | 能够描述系统化方法：1) 告警审计删除无效规则 2) 告警分级和路由 3) 告警去重和关联 4) 动态阈值替代静态阈值 5) 引入告警 SLO（告警准确率指标） | → 治理方法
❌ | 只知道"多配几条告警规则"或"把阈值调高一点" | → 需培训
→ | 推荐 SRE Workbook 中关于告警哲学的章节 |

### E3 — 跨云统一
如何统一阿里云云监控、AWS CloudWatch 和 GCP Cloud Monitoring 的指标？
✅ | 能够描述技术方案：OpenTelemetry Collector 作为统一采集代理 → Prometheus Remote Write → VictoriaMetrics/Thanos → Grafana；理解各云指标命名和维度的差异和映射 | → 跨云方案
❌ | 认为各云指标无法统一，只能各自看各自的 Dashboard | → 需技术方案
→ | 从 OpenTelemetry 开始统一，先 Metrics 再 Logs 再 Traces |

## 远景能源适配要求 {exec}
| EnOS 平台监控 | 1. 全球数十万 IoT 设备的连接状态监控<br>2. 数据接入管道的吞吐量和延迟监控<br>3. 多租户场景下的隔离监控<br>4. EnOS 各微服务的链路追踪 |
| 风电场监控 | 1. 风机运行状态实时监控（振动、温度、转速、发电量）<br>2. SCADA 数据采集系统的可用性监控<br>3. 边缘节点的健康状态监控（网络可能不稳定）<br>4. 风电场网络链路质量监控 |
| 跨云统一需求 | 1. 阿里云（云监控 + SLS + ARMS）数据需要汇入统一平台<br>2. AWS（CloudWatch + X-Ray）数据汇入<br>3. 私有云（Zabbix 存量）数据汇入<br>4. 统一 Dashboard 展示全球基础设施状态 |

## 典型工作场景 {exec}
| 场景一：统一监控平台建设 | **背景：** 当前 5 套独立监控工具，运维需要在多个界面间切换<br>**任务：** 建设统一可观测性平台，实现 Metrics/Logs/Traces 三大支柱的跨云汇聚<br>**挑战：** 各云指标格式不同；Zabbix 存量监控的迁移；数据量大导致存储成本高<br>**预期产出：** 统一 Grafana Dashboard，覆盖 > 90% 基础设施资源 |
| 场景二：告警风暴治理 | **背景：** On-Call 工程师每天收到 500+ 告警，90% 是无效告警<br>**任务：** 系统性治理告警，将有效告警筛选出来<br>**挑战：** 无人敢删告警规则（怕漏报）；告警规则缺乏文档和 owner<br>**预期产出：** 告警数量减少 70%，P1+ 事件发现时间 < 5 分钟 |
| 场景三：生产故障快速定位 | **背景：** EnOS 平台某区域用户反馈数据延迟，需要快速定位根因<br>**任务：** 利用可观测性平台，从用户侧表现追踪到具体的基础设施问题<br>**挑战：** 问题可能跨多个服务和基础设施层；需要 Metrics+Logs+Traces 关联分析<br>**预期产出：** 15 分钟内定位根因，MTTR < 30 分钟 |

## 建议学习路径 {exec}
| Phase 1（入职 1-3 月） | 1. 盘点远景现有监控工具和覆盖率<br>2. 评估各云原生监控产品的能力和局限<br>3. 完成统一可观测性平台的技术选型<br>4. 定义核心服务的 SLI/SLO |
| Phase 2（4-6 月） | 1. 部署 OpenTelemetry Collector + Grafana Stack<br>2. 完成首批服务的 Metrics/Logs 接入<br>3. 启动告警治理（审计 + 分级 + 路由）<br>4. 建立 On-Call 轮值机制 |
| Phase 3（7-12 月） | 1. 完成 > 90% 基础设施的监控覆盖<br>2. Traces 接入核心服务链路<br>3. 实现 MTTR < 15 分钟<br>4. 引入 AIOps 异常检测试点 |

## 成功标准与 KPI {risk}
| 成功标准 | 1. MTTR < 15 min（当前 > 45 min）<br>2. 监控覆盖率 > 90% 基础设施资源<br>3. 告警准确率 > 80%（有效告警 / 总告警）<br>4. SLO 达标率 > 99%（核心服务）<br>5. P1 事件发现时间 < 5 min |
| 风险 | 1. 多云数据汇聚的网络带宽和延迟成本<br>2. Zabbix 存量监控迁移的过渡期可能存在监控空白<br>3. AIOps 的效果依赖数据质量和量级 |
| 与其他能力域的协同 | **→ 能力一（网络）：** 网络监控是可观测性的基础层<br>**→ 能力四（IaC）：** 监控配置通过 IaC 统一部署（Grafana Dashboard as Code）<br>**→ 能力五（FinOps）：** 监控数据支持资源利用率分析和成本优化<br>**→ 能力六（容灾）：** DR 故障检测依赖监控告警 |
