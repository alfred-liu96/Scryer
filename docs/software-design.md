# Scryer (占星者) 软件设计文档

## 1. 需求分析与拆解

### 1.1 项目愿景
Scryer 是一个由 AI 驱动的「影视剧/游戏/综艺/小说」解说网站，目标是成为智能化的内容解说 Bot，为用户提供个性化的内容讲解和展示。

### 1.2 核心功能需求

#### 1.2.1 用户交互层
- **搜索功能**: 用户可以检索感兴趣的影视/游戏/综艺/小说内容
- **提问功能**: 用户可以对故事剧情、角色关系等进行自然语言提问
- **展示界面**: 动态生成的多媒体展示页面

#### 1.2.2 AI 智能体处理流程
1. **内容检索**: 从搜索引擎查找相关内容
2. **内容分析**: 根据用户问题分析、整理和筛选信息
3. **展示生成**: 设计展示风格并生成动态页面代码

#### 1.2.3 展示形式（无限制）
- 文本介绍
- 剧情时间轴
- 角色关系图谱
- 交互式地图
- 数据可视化
- 其他创意形式

### 1.3 非功能性需求

#### 1.3.1 性能要求
- 响应时间: 搜索查询 < 2s，AI 分析 < 10s
- 并发支持: 支持 100+ 并发用户
- 缓存策略: 常见内容查询缓存，减少重复计算

#### 1.3.2 可扩展性
- 模块化架构，易于添加新的内容源
- 支持多种 AI 模型切换
- 前后端分离，便于独立部署和扩展

#### 1.3.3 安全性
- API 密钥管理
- 内容过滤和审核
- 防 Rate Limiting

#### 1.3.4 可维护性
- 完善的日志系统
- 错误处理和监控
- 代码文档和测试覆盖

### 1.4 用户故事

#### 作为用户，我希望：
1. 在首页搜索框输入感兴趣的作品名称，快速获得相关内容
2. 对剧情提问，例如"《三体》中叶文洁为什么背叛人类？"
3. 看到清晰、美观的回答，可能包含时间线、关系图等可视化元素
4. 继续追问，获得更深入的信息

---

## 2. 软件架构设计

### 2.1 整体架构

采用**三层架构** + **AI 智能体层**：

```
┌─────────────────────────────────────────────────────────┐
│                    前端展示层 (Frontend)                  │
│  Web UI / 搜索界面 / 动态内容展示 / 用户交互               │
└─────────────────────────────────────────────────────────┘
                            ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────┐
│                   后端服务层 (Backend)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ API 网关 │ │ 用户服务 │ │ 内容服务 │  │任务服务 │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  AI 智能体层 (AI Agent)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │搜索 Agent│→ │分析 Agent│→ │生成 Agent│  │协调 Agent││
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    数据存储层 (Data)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ PostgreSQL│ │  Redis   │ │ 向量数据库 │ │对象存储│ │
│  │(元数据)   │ │  (缓存)  │ │(RAG/知识) │ │(媒体) │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   外部服务层 (External)                   │
│  搜索引擎 API / AI 模型 API / 内容源 API / 社交媒体 API  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 核心组件设计

#### 2.2.1 前端模块 (Frontend)

**技术栈建议**:
- 框架: React / Vue.js / Next.js
- 状态管理: Zustand / Pinia
- UI 组件: shadcn/ui / Ant Design / Element Plus
- 可视化: D3.js / ECharts / Cytoscape.js (关系图)

**核心页面**:
1. **首页**: 搜索框、热门推荐、最近查询
2. **搜索结果页**: 结果列表、筛选器
3. **内容展示页**: 动态渲染 AI 生成的内容
4. **用户中心**: 历史记录、收藏、设置

#### 2.2.2 后端服务模块 (Backend)

**技术栈建议**:
- 语言: Python 3.11+
- 框架: FastAPI / Django / Flask
- 异步: asyncio / aiohttp
- 任务队列: Celery / RQ / Dramatiq

**核心服务**:

1. **API 网关**
   - 路由分发
   - 认证授权 (JWT)
   - 限流熔断

2. **用户服务** (user-service)
   - 用户注册/登录
   - 历史记录
   - 个人收藏
   - 偏好设置

3. **内容服务** (content-service)
   - 搜索接口
   - 内容获取
   - 结果缓存
   - 展示渲染

4. **任务服务** (task-service)
   - 异步任务管理
   - 任务状态跟踪
   - 失败重试

#### 2.2.3 AI 智能体模块 (AI Agent)

**技术栈建议**:
- AI 框架: LangChain / LlamaIndex / AutoGen
- 模型: Claude / GPT-4 / GLM-4 (根据需求切换)
- 向量数据库: Chroma / Pinecone / Milvus
- 嵌入模型: text-embedding-3 / bge-large-zh

**核心 Agents**:

1. **搜索 Agent** (Search Agent)
   - 职责: 理解用户查询，调用搜索引擎 API
   - 输入: 用户查询 + 上下文
   - 输出: 搜索结果列表 (URL + 摘要)
   - 工具: Google Search API / Bing Search API / SerpAPI

2. **分析 Agent** (Analysis Agent)
   - 职责: 阅读和分析搜索结果，提取关键信息
   - 输入: 搜索结果 + 用户问题
   - 输出: 结构化信息 (剧情/角色/时间线等)
   - 工具: 网页抓取 + LLM 理解

3. **生成 Agent** (Generation Agent)
   - 职责: 根据分析结果设计展示形式并生成代码
   - 输入: 结构化信息 + 展示偏好
   - 输出: HTML/CSS/JS 代码或 JSON 数据
   - 能力: 代码生成 + 可视化设计

4. **协调 Agent** (Orchestrator Agent)
   - 职责: 协调上述三个 Agent，处理复杂的多步骤任务
   - 决策: 是否需要更多搜索 / 分析是否充分 / 展示形式选择

#### 2.2.4 数据存储层

1. **PostgreSQL**
   - 用户数据
   - 查询历史
   - 内容元数据
   - 任务记录

2. **Redis**
   - 热点内容缓存
   - 会话存储
   - 速率限制
   - 任务队列

3. **向量数据库** (Vector DB)
   - 知识库向量化 (用于 RAG)
   - 语义搜索
   - 内容去重

4. **对象存储** (S3/MinIO/OSS)
   - 媒体文件 (图片/视频)
   - 生成的静态资源

### 2.3 技术栈推荐

#### 前端
```
- Next.js 14 (App Router) / Vue 3 + Nuxt 3
- TypeScript
- Tailwind CSS
- shadcn/ui / Naive UI
- ECharts / D3.js / React Flow
```

#### 后端
```
- Python 3.11+
- FastAPI (异步高性能)
- SQLAlchemy / Tortoise ORM
- Pydantic (数据验证)
- Celery + Redis (任务队列)
```

#### AI/ML
```
- LangChain / LangGraph
- OpenAI SDK / Anthropic SDK
- ChromaDB / Qdrant
- BeautifulSoup / Playwright (网页抓取)
```

#### 基础设施
```
- Docker + Docker Compose
- Nginx (反向代理)
- PostgreSQL 15
- Redis 7
- MinIO (对象存储，开发环境)
```

#### DevOps
```
- GitHub Actions (CI/CD)
- pytest (测试)
- ruff (linting)
- Prometheus + Grafana (监控)
```

### 2.4 关键流程设计

#### 2.4.1 搜索-分析-生成流程

```
用户输入查询
    ↓
[前端] 发送请求到后端 API
    ↓
[后端] 创建异步任务，返回 task_id
    ↓
[AI 协调 Agent] 分析意图
    ↓
[搜索 Agent] 调用搜索引擎 API
    ↓
[分析 Agent] 抓取和分析内容
    │
    ├─ 需要更多信息？→ 回到搜索 Agent
    │
    ↓ 信息充分
[生成 Agent] 设计展示 + 生成代码
    ↓
[后端] 保存结果，更新任务状态
    ↓
[前端] 轮询/WebSocket 获取结果，动态渲染
```

#### 2.4.2 缓存策略

1. **L1 缓存**: 内存缓存 (最近查询)
2. **L2 缓存**: Redis (热门内容)
3. **L3 缓存**: 数据库 (历史查询)

缓存键设计:
- `search:{query_hash}` → 搜索结果
- `content:{content_id}` → 生成内容
- `render:{content_id}:{template}` → 渲染结果

TTL 策略:
- 搜索结果: 1 小时
- 生成内容: 24 小时
- 渲染结果: 7 天

---

## 3. 数据模型设计

### 3.1 核心表结构

#### users (用户表)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    preferences JSONB DEFAULT '{}'
);
```

#### queries (查询记录表)
```sql
CREATE TABLE queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    query_text TEXT NOT NULL,
    query_type VARCHAR(20), -- 'search', 'question', 'explain'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

#### contents (内容表)
```sql
CREATE TABLE contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID REFERENCES queries(id),
    title VARCHAR(255),
    content_type VARCHAR(50), -- 'movie', 'game', 'novel', 'show'
    source_url TEXT,
    raw_data JSONB, -- 搜索和分析的原始数据
    generated_code TEXT, -- AI 生成的展示代码
    template_type VARCHAR(50), -- 'timeline', 'graph', 'text', etc.
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### search_results (搜索结果表)
```sql
CREATE TABLE search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID REFERENCES queries(id),
    url TEXT NOT NULL,
    title VARCHAR(255),
    snippet TEXT,
    source VARCHAR(100), -- 'google', 'bing', etc.
    relevance_score FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### tasks (任务表)
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID REFERENCES queries(id),
    task_type VARCHAR(50) NOT NULL, -- 'search', 'analyze', 'generate'
    status VARCHAR(20) DEFAULT 'pending',
    result JSONB,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

### 3.2 向量数据库 Schema

```python
# ChromaDB Collection
collection_name = "knowledge_base"

documents = {
    "id": "unique_id",
    "text": "content_text",
    "metadata": {
        "source": "url",
        "content_type": "movie/game/novel",
        "title": "content_title",
        "created_at": "timestamp"
    },
    "embeddings": [0.1, 0.2, ...]  # 向量嵌入
}
```

---

## 4. API 接口设计

### 4.1 REST API

#### 认证相关
```
POST /api/auth/register      # 用户注册
POST /api/auth/login         # 用户登录
POST /api/auth/refresh       # 刷新 Token
POST /api/auth/logout        # 登出
```

#### 搜索相关
```
GET  /api/search?q={query}              # 搜索内容
POST /api/search/advanced               # 高级搜索
GET  /api/search/history                # 搜索历史
GET  /api/search/suggestions            # 搜索建议
```

#### 内容相关
```
GET  /api/contents/{id}                 # 获取内容详情
GET  /api/contents/{id}/render          # 获取渲染结果
POST /api/contents/{id}/feedback        # 用户反馈
```

#### 任务相关
```
GET  /api/tasks/{id}                    # 获取任务状态
GET  /api/tasks/{id}/result             # 获取任务结果
POST /api/tasks/{id}/retry              # 重试失败任务
```

#### 用户相关
```
GET  /api/users/me                      # 获取用户信息
PUT  /api/users/me                      # 更新用户信息
GET  /api/users/me/history              # 用户历史
GET  /api/users/me/favorites            # 用户收藏
```

### 4.2 WebSocket

```
WS /api/ws/task/{task_id}               # 任务进度实时推送
```

消息格式:
```json
{
  "type": "progress",
  "data": {
    "step": "searching",
    "progress": 0.3,
    "message": "正在搜索相关内容..."
  }
}
```

---

## 5. 部署架构

### 5.1 开发环境
```
┌─────────────────────────────────────┐
│         Docker Compose               │
│  ┌─────────┐  ┌─────────┐           │
│  │ Frontend│  │ Backend │           │
│  │ :3000   │  │ :8000   │           │
│  └─────────┘  └─────────┘           │
│       ↓            ↓                 │
│  ┌─────────┐  ┌─────────┐           │
│  │  Nginx  │  │  Redis  │           │
│  │  :80    │  │  :6379  │           │
│  └─────────┘  └─────────┘           │
│                    ↓                 │
│             ┌─────────┐              │
│             │PostgreSQL│             │
│             │  :5432   │             │
│             └─────────┘              │
└─────────────────────────────────────┘
```

### 5.2 生产环境建议
```
                    ┌─────────┐
                    │  CDN    │
                    └────┬────┘
                         ↓
              ┌──────────────────┐
              │   Load Balancer  │
              └────────┬─────────┘
                       ↓
        ┌──────────────┴──────────────┐
        ↓                             ↓
┌───────────────┐           ┌────────────────┐
│  Frontend     │           │  Backend API   │
│  (Vercel/Netlify)│         │  (K8s Pods)   │
└───────────────┘           └───────┬────────┘
                                    ↓
                         ┌─────────────────────┐
                         │   Service Mesh      │
                         └─────────┬───────────┘
                                   ↓
        ┌──────────────────────────┼──────────────────────┐
        ↓          ↓                ↓          ↓           ↓
    ┌───────┐ ┌───────┐     ┌─────────┐ ┌─────────┐ ┌─────────┐
    │Redis  │ │PostgreSQL│    │Vector DB│ │MinIO    │ │Celery   │
    │Cluster│ │ Cluster │     │         │ │         │ │Workers  │
    └───────┘ └────────┘     └─────────┘ └─────────┘ └─────────┘
```

---

## 6. 粗略任务列表

### Phase 1: 项目初始化与基础设施 (Week 1-2)
- [ ] 初始化 Git 仓库，配置开发规范
- [ ] 搭建 Docker 开发环境
- [ ] 配置数据库 (PostgreSQL + Redis)
- [ ] 搭建基础后端框架 (FastAPI)
- [ ] 搭建基础前端框架 (Next.js / Vue)
- [ ] 配置 CI/CD 流程
- [ ] 编写基础文档 (README, CONTRIBUTING)

### Phase 2: 核心功能开发 (Week 3-6)
- [ ] 实现用户认证系统
- [ ] 实现搜索接口集成
- [ ] 开发搜索 Agent (接入搜索引擎 API)
- [ ] 开发分析 Agent (网页抓取 + 内容分析)
- [ ] 开发生成 Agent (展示代码生成)
- [ ] 开发协调 Agent (任务编排)
- [ ] 实现任务队列系统 (Celery)
- [ ] 实现前端搜索页面
- [ ] 实现前端内容展示页面

### Phase 3: 高级功能与优化 (Week 7-10)
- [ ] 集成向量数据库，实现 RAG
- [ ] 实现智能缓存策略
- [ ] 开发多种展示模板 (时间轴、关系图等)
- [ ] 实现 WebSocket 实时推送
- [ ] 添加用户历史记录功能
- [ ] 性能优化与压力测试
- [ ] 日志系统与监控告警

### Phase 4: 测试与部署 (Week 11-12)
- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 端到端测试
- [ ] 安全审计
- [ ] 部署到生产环境
- [ ] 用户测试与反馈收集
- [ ] Bug 修复与迭代

### Phase 5: 迭代与扩展 (Ongoing)
- [ ] 支持更多内容源
- [ ] 优化 AI Agent 协作逻辑
- [ ] 添加更多展示形式
- [ ] 移动端适配
- [ ] 国际化支持
- [ ] 社区建设

---

## 7. 风险与挑战

### 7.1 技术风险
1. **AI 模型成本**: 大量 API 调用可能产生高昂费用
   - 缓解: 实施多层缓存，优先使用开源模型

2. **内容准确性**: AI 生成内容可能存在错误
   - 缓解: 多源交叉验证，用户反馈机制

3. **性能瓶颈**: 复杂查询耗时较长
   - 缓解: 异步处理 + 流式输出

### 7.2 业务风险
1. **版权问题**: 抓取和展示内容可能侵权
   - 缓解: 只提供摘要和链接，声明来源

2. **用户留存**: 初期功能单一，难以吸引用户
   - 缓解: 聚焦垂直领域，提供独特价值

### 7.3 运营风险
1. **API 稳定性**: 依赖外部服务
   - 缓解: 多供应商备份，降级策略

---

## 8. 总结

Scryer 是一个创新的 AI 驱动内容解说平台，核心价值在于:

1. **智能化**: AI Agent 自动化搜索、分析、生成全流程
2. **个性化**: 根据用户问题定制展示形式
3. **可视化**: 丰富的多媒体展示，超越纯文本
4. **可扩展**: 模块化架构，易于添加新功能

通过合理的架构设计和分阶段实施，可以逐步构建一个稳定、高效、用户友好的内容解说平台。

---

## 附录

### A. 参考资料
- LangChain 文档: https://python.langchain.com/
- FastAPI 文档: https://fastapi.tiangolo.com/
- Next.js 文档: https://nextjs.org/docs

### B. 相关项目
- Perplexity AI (搜索 + AI 回答)
- Phind (AI 搜索引擎)
- ChatGPT Plugins (知识检索)

### C. 技术选型对比表
(待补充详细对比)
