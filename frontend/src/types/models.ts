/**
 * 业务实体类型定义
 */

// 用户模型 (对应后端 User)
export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 任务模型 (对应后端 Task)
export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
  updated_at: string;
  user_id: number;
}

// 内容模型 (对应后端 Content)
export interface Content {
  id: number;
  title: string;
  body: string;
  summary?: string;
  source_url?: string;
  author?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}
