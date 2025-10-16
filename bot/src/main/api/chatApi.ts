import { CozeAPI } from '@coze/api';

// Coze API配置
interface CozeConfig {
  apiKey: string;
  workflowId: string;
}

// 工作流响应内容
interface WorkflowContent {
  output1?: string; // 文本输出
  output2?: string; // 代码输出
  [key: string]: any;
}

export class ChatAPI {
  private apiClient: CozeAPI;
  private config: CozeConfig;

  constructor() {
    // Coze API配置 - 使用提供的API密钥
    this.config = {
      apiKey: process.env.COZE_API_KEY || 'pat_qEi7EbLQ58XZ5rOfCmunL0jgu73OfbFtHMPG6p0EBehkFDZ0j97r3wfMGgjlnX0F', // 您提供的API密钥
      workflowId: '7559597338584334382', // 从用户提供的URL中提取的工作流ID
    };

    // 创建Coze API客户端
    this.apiClient = new CozeAPI({
      token: this.config.apiKey,
      baseURL: 'https://api.coze.cn'
    });
  }

  /**
   * 发送消息到Coze工作流
   * @param message 用户消息
   * @returns 返回AI响应（包含文本和代码）
   */
  async sendMessage(message: string): Promise<WorkflowContent> {
    // 模拟响应 - 用于测试界面功能
    const MOCK_MODE = false; // 已改为false，使用真实API
    
    if (MOCK_MODE) {
      console.log('[Mock Mode] Received message:', message);
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 根据不同输入返回不同的模拟响应
      if (message.includes('代码') || message.includes('编程')) {
        return {
          output1: '这是一个优化后的Python代码示例，展示了如何解决经典的鸡兔同笼问题。代码添加了适当的注释和错误处理。',
          output2: `# 鸡兔同笼问题求解器
tu = 0  # 兔子数量
has_solution = False  # 是否找到解

while tu < 41:
    ji = 40 - tu  # 鸡的数量
    
    # 检查是否满足腿数条件
    if ji * 2 + tu * 4 == 102:
        print(f"找到解：{ji}只鸡，{tu}只兔")
        has_solution = True
        break  # 找到解后退出循环
    
    tu = tu + 1

# 如果没找到解，输出提示
if not has_solution:
    print("此题无解")`
        };
      }
      
      // 默认响应
      return {
        output1: `你说："${message}"。这是一个模拟响应，用于测试界面功能。真实的Coze API需要正确的配置和权限才能调用。`,
        output2: undefined // 没有代码部分
      };
    }
    
    try {
      console.log('[API] Sending message to Coze:', message);
      
      // 使用官方SDK调用工作流
      const response = await this.apiClient.workflows.runs.create({
        workflow_id: this.config.workflowId,
        parameters: {
          input: message, // 用户输入
        },
      });

      console.log('[API] Received response:', response);

      // 处理响应
      if (response) {
        console.log('[API] Response data:', JSON.stringify(response, null, 2));
        
        // 尝试解析content字段
        let content: WorkflowContent = {};
        
        // 根据响应结构解析数据
        const responseData = response as any;
        
        // 查找包含输出的字段
        let outputData = responseData.data || responseData.output || responseData.result || responseData;
        
        // 如果是字符串，尝试解析
        if (typeof outputData === 'string') {
          try {
            outputData = JSON.parse(outputData);
          } catch {
            // 如果解析失败，作为纯文本
            content = { output1: outputData };
          }
        }
        
        // 查找content字段
        if (outputData.content) {
          if (typeof outputData.content === 'string') {
            try {
              content = JSON.parse(outputData.content);
            } catch {
              content = { output1: outputData.content };
            }
          } else {
            content = outputData.content;
          }
        } else {
          // 直接使用输出数据
          content = outputData;
        }

        // 确保返回正确的格式
        return {
          output1: content.output1 || content.text || content.result || content.message || '没有文本输出',
          output2: content.output2 || content.code || undefined,
          ...content
        };
      } else {
        throw new Error('API响应为空');
      }
    } catch (error) {
      console.error('[API] Failed to send message:', error);
      
      // 错误处理
      if (error instanceof Error) {
        throw new Error(`调用Coze API失败: ${error.message}`);
      }
      
      throw new Error('发送消息时发生未知错误');
    }
  }

  /**
   * 设置API密钥
   * @param apiKey 新的API密钥
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    // 重新创建API客户端
    this.apiClient = new CozeAPI({
      token: apiKey,
      baseURL: 'https://api.coze.cn'
    });
    console.log('[API] API key updated');
  }
}
