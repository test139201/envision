---
id: 4
title: 基础设施即代码（IaC）
badge: 重要能力
badge-class: p1
status: S1-重要
status-class: active
subtitle: 全部基础设施以代码方式管理 — 可审计、可复现、可回滚，消除手工配置的风险和效率损耗
---

## 基本信息
| 能力域定位 | 推动远景能源全球基础设施从手工配置转向代码化管理（Infrastructure as Code），实现环境一致性、变更可审计、部署可复现 |
| 对应痛点 | **#4 IaC 覆盖率低**（S1-重要）— 大量基础设施仍为手工配置，变更难以审计和回滚 |
| 上下游关系 | **上游依赖：** 能力二（多云管理）提供跨云资源标准化需求<br>**下游影响：** IaC 框架是 #6 监控（一致性部署）和 #3 安全合规（策略即代码）的关键基础 |
| 能力稀缺度 | **中** — 市场上有较多 Terraform/Pulumi 经验的人才，但具备多云 + 大规模 Module 管理经验的较少 |
| 岗位权重 | 八大能力域中权重 10%，是基础设施现代化的关键推动力 |

## 核心职责详解 {hyp}

### 4.1 — IaC 技术栈选型
为远景多云环境选择合适的 IaC 工具链（Terraform / Pulumi / CrossPlane / CloudFormation / ROS），并建立标准化的技术栈
✅ | 能够对比主流 IaC 工具的优劣（声明式 vs 命令式、多云支持、状态管理、团队协作、学习曲线）；有根据组织需求做出技术选型的经验和方法论 | → 选型报告<br>→ 技术栈文档
❌ | 只熟悉单一 IaC 工具，无法进行对比选型；或只会使用 Console/CLI 手工操作 | → IaC 评估
→ | 以 Terraform 为起点（市场占有率最高，多云支持最好），逐步扩展 |

### 4.2 — Module 库设计与管理
建立标准化的 IaC Module 库（Terraform Module Registry），提供可复用的基础设施模板，覆盖网络、计算、存储、安全等核心资源类型
✅ | 能够设计分层 Module 架构（原子模块 → 组合模块 → 场景模板）；有 Module 版本管理和发布流程；Module 覆盖 3+ 云厂商的核心资源 | → Module 库<br>→ 设计规范
❌ | IaC 代码全是一次性的单体脚本，没有模块化和复用设计 | → Module 化
→ | 从最常用的资源类型开始，逐步抽取和标准化 Module |

### 4.3 — GitOps 工作流
建立基于 Git 的基础设施变更管理工作流：PR Review → Plan → Approve → Apply，确保每次变更都有审批记录
✅ | 有 GitOps 工作流实施经验（Atlantis / Terraform Cloud / Spacelift）；理解 PR-based 变更审批的安全价值；已实现 Plan 输出自动评论到 PR | → GitOps 流程<br>→ CI/CD Pipeline
❌ | 基础设施变更直接在 Console 或 CLI 上执行，没有版本控制和审批流程 | → GitOps 培训
→ | 先将现有基础设施导入 Terraform State，再建立 GitOps 流程 |

### 4.4 — 配置漂移检测与修复
建立配置漂移（Drift Detection）机制，定期检测实际基础设施状态与代码定义的偏差，并自动或半自动修复
✅ | 了解 `terraform plan` 的漂移检测原理；有定时 Drift Check 的自动化方案；能够区分"合理漂移"（紧急修复）和"非法漂移"（未经审批的变更） | → 漂移检测<br>→ 修复策略
❌ | 代码和实际环境严重不一致，`terraform plan` 输出大量意外变更 | → 状态同步
→ | 先做一次全量的 State 同步（import/refresh），再建立持续检测机制 |

### 4.5 — 安全与合规策略即代码
将安全和合规策略（Security/Compliance Policy）编码为可自动化执行的规则：OPA/Sentinel/Checkov/tfsec
✅ | 有 Policy as Code 实施经验；能够将安全策略（如"禁止公网暴露 RDS"、"所有磁盘必须加密"）编写为自动化检查规则；规则集成到 CI/CD 流程 | → Policy 规则<br>→ CI/CD 集成
❌ | 安全策略只在文档中，依赖人工审查和事后检查 | → PaC 培训
→ | 从 tfsec/Checkov 开始（零配置即可使用），逐步扩展到自定义 OPA 规则 |

### 4.6 — 密钥与敏感信息管理
设计 IaC 流程中的密钥管理方案：确保敏感信息不出现在代码仓库中，通过 Vault / KMS / Sealed Secrets 注入
✅ | 有 HashiCorp Vault / AWS Secrets Manager / 阿里云 KMS 集成经验；了解 Terraform 中 sensitive 变量处理和 State 文件加密；有 Secret Rotation 自动化方案 | → 密钥管理<br>→ Vault 集成
❌ | 密钥硬编码在 Terraform 代码中，或通过环境变量手动管理 | → 密钥治理
→ | 立即排查并清除代码中的硬编码密钥；部署 Vault 或使用云原生 KMS |

## 硬技能要求 {disc}
| Terraform | 精通 HCL 语法、Provider 机制、State 管理（远端 Backend：S3/OSS/GCS）、Workspace、Module 开发与发布、Import/Refresh、Provisioner |
| 多云 Provider | 熟练使用 alicloud / aws / google 三个 Terraform Provider；了解各 Provider 的资源覆盖率和限制 |
| CI/CD 集成 | Terraform 与 CI/CD 系统集成（GitLab CI / GitHub Actions / Jenkins）；Atlantis 或 Terraform Cloud 配置 |
| Policy as Code | OPA（Open Policy Agent）/ Rego 语言、Sentinel（HashiCorp）、Checkov、tfsec、Terrascan |
| 密钥管理 | HashiCorp Vault 部署与运维、各云 KMS 集成、Sealed Secrets（K8s）、SOPS（加密文件） |
| 状态管理 | Terraform State Lock 机制、State 文件安全（加密 + 访问控制）、State 迁移和拆分 |
| 测试框架 | Terratest（Go）/ Kitchen-Terraform / pytest-terraform 编写基础设施测试用例 |

## 评估维度 — 面试考察要点 {hyp}

### E1 — IaC 规模经验
请描述你管理过的最大规模的 IaC 代码库（多少资源、多少模块、多少人协作）
✅ | 管理过 1000+ 资源的 Terraform 代码库；有 Module 分层设计经验；支撑 5+ 人团队并行开发；解决过 State 锁冲突和大型重构的问题 | → 规模经验
❌ | IaC 代码库只有少量资源，或者只是个人使用，没有团队协作经验 | → 规模不足
→ | 规模可以在工作中积累，关键是架构设计能力和最佳实践的理解 |

### E2 — 多云 IaC 挑战
Terraform 管理阿里云、AWS、GCP 同时存在，你如何处理三个 Provider 之间的差异？
✅ | 能够描述 Provider 差异的处理策略：抽象层 Module 封装相似资源、Provider-specific Module 处理差异资源、变量映射表统一命名规范；了解 Crossplane 等更高层抽象工具 | → 多云 IaC
❌ | 各云的 Terraform 代码完全独立，没有复用和标准化 | → 需标准化
→ | 从命名规范和标签策略开始统一，再逐步抽象 Module |

### E3 — 故障恢复
Terraform apply 执行到一半失败了，环境处于不一致状态，你怎么处理？
✅ | 能够描述 State 分析 → 手动修复/import → 重新 Plan 验证 → 谨慎 Apply 的完整流程；了解 `-target` 精确操作和 State 手动编辑（`terraform state rm/mv`）的适用场景和风险 | → 故障处理
❌ | 遇到 Apply 失败就 `destroy` 重来，或者直接手动修改 Console 不更新 State | → 需培训
→ | 这是关键能力，必须具备；可通过模拟演练快速提升 |

## 远景能源适配要求 {exec}
| 多云 IaC 挑战 | 远景同时使用阿里云、AWS、GCP 和私有云，IaC 代码需要覆盖全部环境：<br>1. alicloud Provider（中国区核心）<br>2. aws Provider（海外核心）<br>3. google Provider（数据分析）<br>4. vsphere/proxmox Provider（私有云/工厂边缘） |
| 存量导入 | 当前大量已有基础设施是手工创建的（IaC 覆盖率 < 15%），需要制定存量导入策略：<br>1. 使用 `terraformer` / `former2` 自动生成代码<br>2. 逐个 import 高价值资源（生产环境优先）<br>3. 新资源必须 IaC first，老资源分批导入 |
| 团队培训 | 各区域运维团队的 IaC 能力参差不齐：<br>1. 中国区部分团队有 Terraform 经验<br>2. 欧洲和东南亚团队偏传统运维<br>3. 需要分层培训 + Module 模板降低使用门槛 |

## 典型工作场景 {exec}
| 场景一：IaC 框架从零搭建 | **背景：** 远景当前 IaC 覆盖率 < 15%，需要从零建立 IaC 体系<br>**任务：** 选型 Terraform + GitOps，搭建 Module 库，建立 CI/CD Pipeline<br>**挑战：** 存量资源导入工作量大；各区域团队能力差异；需要渐进式推进不影响现有运维<br>**预期产出：** IaC 框架就绪，首批 Module 发布，GitOps 流程上线，覆盖率 > 40% |
| 场景二：生产环境紧急修复后的 Drift 处理 | **背景：** 凌晨 2 点生产故障，运维通过 Console 手动修改了安全组规则和 ECS 配置<br>**任务：** 故障修复后，将手动变更同步回 Terraform 代码和 State<br>**挑战：** 需要识别哪些变更是故障修复必要的（应保留），哪些是操作失误（应回滚）<br>**预期产出：** 代码与实际一致，Drift 清零，事后复盘报告 |
| 场景三：新区域环境快速交付 | **背景：** 业务需要在 2 周内在 AWS 东京区域部署一套完整的 EnOS 基础设施<br>**任务：** 使用已有 Module 模板，通过 Terraform 快速创建 VPC + EKS + RDS + S3 + IAM 全套环境<br>**挑战：** 东京区域可能有 Quota 限制；需要适配日本区域的合规要求；时间紧迫<br>**预期产出：** 2 周内交付 Ready 环境，部署文档自动生成 |

## 建议学习路径 {exec}
| Phase 1（入职 1-3 月） | 1. 盘点远景现有基础设施的 IaC 现状<br>2. 完成 HashiCorp Terraform Associate 认证<br>3. 搭建 Module 库骨架和 Git 仓库规范<br>4. 配置 Terraform 远端 State Backend |
| Phase 2（4-6 月） | 1. 完成核心 Module 开发（VPC/Compute/Storage/IAM/K8s）<br>2. 建立 GitOps CI/CD Pipeline<br>3. 启动存量资源导入（生产环境优先）<br>4. 培训各区域团队基础 Terraform 操作 |
| Phase 3（7-12 月） | 1. IaC 覆盖率达到 60%+（核心资源 80%+）<br>2. Policy as Code 集成到 CI/CD<br>3. 配置漂移检测自动化运行<br>4. IaC 模板支撑新环境 2 周内交付 |

## 成功标准与 KPI {risk}
| 成功标准 | 1. IaC 覆盖率 > 80%（核心生产资源）<br>2. 新环境交付时间从 8 周缩短至 2 周<br>3. 基础设施变更 100% 通过 GitOps 流程（禁止 Console 直接修改生产环境）<br>4. 配置漂移检测率 100%（每日自动扫描）<br>5. Module 复用率 > 70%（新资源使用已有 Module） |
| 风险 | 1. 存量导入工作量大，可能影响其他工作优先级<br>2. IaC 迁移过程中可能引发生产事故（Apply 误操作）<br>3. 团队抵触变更（习惯了 Console 操作） |
| 与其他能力域的协同 | **→ 能力二（多云）：** IaC Module 需要覆盖阿里云/AWS/GCP 三个 Provider<br>**→ 能力三（安全）：** Policy as Code 将安全策略编码为自动化检查<br>**→ 能力六（容灾）：** DR 环境通过 IaC 快速重建<br>**→ 能力七（可观测性）：** 监控配置通过 IaC 统一部署 |
