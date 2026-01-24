// 多语言翻译文件
const translations = {
  zh: {
    // 导航栏
    nav: {
      features: "功能",
      pricing: "定价",
      api: "API 文档",
      quickstart: "快速开始",
      github: "GitHub"
    },

    // Hero 区域
    hero: {
      title1: "为 AI Agents 设计的",
      title2: "链上数据服务",
      subtitle: "通过 x402 微支付协议，AI Agents 可以自主调用实时链上数据<br/>无需账户、订阅或复杂集成 - 按需付费，低至 $0.0003/次",
      btnPrimary: "立即开始",
      btnSecondary: "查看文档",
      stat1: "API 工具",
      stat2: "支持链",
      stat3: "起步价"
    },

    // 功能
    features: {
      title: "核心功能",
      subtitle: "为 AI Agents 量身定制的数据服务",
      feature1: {
        title: "实时代币价格",
        desc: "跨 5 条主流链的实时 DEX 价格查询，支持流动性和交易量数据"
      },
      feature2: {
        title: "跨链价格聚合",
        desc: "自动对比多链价格，识别套利机会，推荐最优 DEX"
      },
      feature3: {
        title: "流动池分析",
        desc: "TVL、APY、交易量、无常损失等完整的流动性池数据"
      },
      feature4: {
        title: "巨鲸交易监控",
        desc: "实时监控大额交易，可定制监控阈值和交易类型"
      },
      feature5: {
        title: "合约安全扫描",
        desc: "智能合约风险评分、蜜罐检测、代理合约识别"
      },
      feature6: {
        title: "x402 微支付",
        desc: "无需账户、无需订阅，AI Agent 自主决策和支付"
      },
      instant: "即时结算"
    },

    // 定价
    pricing: {
      title: "简单透明的定价",
      subtitle: "选择最适合你的方案",
      popular: "最受欢迎",
      perMonth: "/月",
      btnFree: "开始使用",
      btnStart: "立即订阅",
      btnPro: "立即订阅",
      btnEnterprise: "联系我们",
      tier: {
        free: {
          name: "Free",
          features: [
            "10 次/天调用",
            "所有 API 访问",
            "社区支持",
            "无 SLA 保证"
          ]
        },
        starter: {
          name: "Starter",
          features: [
            "10,000 次调用/月",
            "所有 API 访问",
            "折扣价格",
            "邮件支持"
          ]
        },
        pro: {
          name: "Pro",
          features: [
            "100,000 次调用/月",
            "所有 API 访问",
            "最高折扣（30%）",
            "优先支持",
            "99.9% SLA"
          ]
        },
        enterprise: {
          name: "Enterprise",
          price: "定制",
          features: [
            "无限调用",
            "专属折扣（最高70%）",
            "定制功能",
            "专属支持",
            "99.99% SLA"
          ]
        }
      }
    },

    // API 文档
    apiDocs: {
      title: "API 文档",
      subtitle: "简单易用的 MCP 接口",
      viewFull: "查看完整 API 文档"
    },

    // 快速开始
    quickstart: {
      title: "5 分钟快速开始",
      step1: {
        title: "克隆仓库",
        code: "git clone https://github.com/your-repo/x402-mcp-server\ncd x402-mcp-server"
      },
      step2: {
        title: "安装依赖",
        code: "npm install\nnpm run build"
      },
      step3: {
        title: "启动服务器",
        code: "npm start\n# 或使用启动脚本\n./start.sh"
      },
      step4: {
        title: "开始调用",
        code: "# 运行示例\npython3 examples/simple-agent-example.py"
      }
    },

    // 网络
    networks: {
      title: "支持的区块链网络"
    },

    // CTA
    cta: {
      title: "准备好开始了吗？",
      subtitle: "立即开始使用 x402 AI Agent 数据服务",
      btnPrimary: "免费开始",
      btnSecondary: "查看 GitHub"
    },

    // Footer
    footer: {
      product: "产品",
      resources: "资源",
      community: "社区",
      about: "关于",
      description: "首个专为 AI Agents 设计的链上数据服务平台",
      poweredBy: "由 x402 协议驱动 🤖⚡💰",
      copyright: "© 2024 x402 Data Service. All rights reserved.",
      contactUs: "联系我们"
    }
  },

  en: {
    nav: {
      features: "Features",
      pricing: "Pricing",
      api: "API Docs",
      quickstart: "Quick Start",
      github: "GitHub"
    },

    hero: {
      title1: "On-Chain Data Service",
      title2: "Designed for AI Agents",
      subtitle: "Through x402 micropayment protocol, AI Agents can autonomously access real-time on-chain data<br/>No account, subscription, or complex integration - Pay-as-you-go, starting from $0.0003/call",
      btnPrimary: "Get Started",
      btnSecondary: "View Docs",
      stat1: "API Tools",
      stat2: "Supported Chains",
      stat3: "Starting Price"
    },

    features: {
      title: "Core Features",
      subtitle: "Data services tailored for AI Agents",
      feature1: {
        title: "Real-time Token Prices",
        desc: "Real-time DEX price queries across 5 major chains, with liquidity and volume data"
      },
      feature2: {
        title: "Multi-chain Price Aggregation",
        desc: "Auto-compare prices across chains, identify arbitrage opportunities, recommend optimal DEX"
      },
      feature3: {
        title: "Liquidity Pool Analytics",
        desc: "Complete liquidity pool data: TVL, APY, volume, impermanent loss, and more"
      },
      feature4: {
        title: "Whale Transaction Monitoring",
        desc: "Real-time monitoring of large transactions with customizable thresholds and types"
      },
      feature5: {
        title: "Contract Security Scanning",
        desc: "Smart contract risk scoring, honeypot detection, proxy contract identification"
      },
      feature6: {
        title: "x402 Micropayments",
        desc: "No account, no subscription - AI Agents make autonomous decisions and payments"
      },
      instant: "Instant Settlement"
    },

    pricing: {
      title: "Simple, Transparent Pricing",
      subtitle: "Choose the plan that fits you best",
      popular: "Most Popular",
      perMonth: "/mo",
      btnFree: "Get Started",
      btnStart: "Subscribe Now",
      btnPro: "Subscribe Now",
      btnEnterprise: "Contact Us",
      tier: {
        free: {
          name: "Free",
          features: [
            "10 calls/day",
            "All API access",
            "Community support",
            "No SLA guarantee"
          ]
        },
        starter: {
          name: "Starter",
          features: [
            "10,000 calls/month",
            "All API access",
            "Discounted pricing",
            "Email support"
          ]
        },
        pro: {
          name: "Pro",
          features: [
            "100,000 calls/month",
            "All API access",
            "Max discount (30%)",
            "Priority support",
            "99.9% SLA"
          ]
        },
        enterprise: {
          name: "Enterprise",
          price: "Custom",
          features: [
            "Unlimited calls",
            "Exclusive discount (up to 70%)",
            "Custom features",
            "Dedicated support",
            "99.99% SLA"
          ]
        }
      }
    },

    apiDocs: {
      title: "API Documentation",
      subtitle: "Simple and easy-to-use MCP interface",
      viewFull: "View Full API Documentation"
    },

    quickstart: {
      title: "Quick Start in 5 Minutes",
      step1: {
        title: "Clone Repository",
        code: "git clone https://github.com/your-repo/x402-mcp-server\ncd x402-mcp-server"
      },
      step2: {
        title: "Install Dependencies",
        code: "npm install\nnpm run build"
      },
      step3: {
        title: "Start Server",
        code: "npm start\n# Or use startup script\n./start.sh"
      },
      step4: {
        title: "Start Calling",
        code: "# Run example\npython3 examples/simple-agent-example.py"
      }
    },

    networks: {
      title: "Supported Blockchain Networks"
    },

    cta: {
      title: "Ready to Get Started?",
      subtitle: "Start using x402 AI Agent Data Service now",
      btnPrimary: "Start Free",
      btnSecondary: "View GitHub"
    },

    footer: {
      product: "Product",
      resources: "Resources",
      community: "Community",
      about: "About",
      description: "The first on-chain data service platform designed for AI Agents",
      poweredBy: "Powered by x402 Protocol 🤖⚡💰",
      copyright: "© 2024 x402 Data Service. All rights reserved.",
      contactUs: "Contact Us"
    }
  },

  ko: {
    nav: {
      features: "기능",
      pricing: "가격",
      api: "API 문서",
      quickstart: "빠른 시작",
      github: "GitHub"
    },

    hero: {
      title1: "AI 에이전트를 위한",
      title2: "온체인 데이터 서비스",
      subtitle: "x402 마이크로페이먼트 프로토콜을 통해 AI 에이전트가 실시간 온체인 데이터에 자율적으로 접근<br/>계정, 구독 또는 복잡한 통합 불필요 - 사용한 만큼 지불, $0.0003/호출부터 시작",
      btnPrimary: "시작하기",
      btnSecondary: "문서 보기",
      stat1: "API 도구",
      stat2: "지원 체인",
      stat3: "시작 가격"
    },

    features: {
      title: "핵심 기능",
      subtitle: "AI 에이전트를 위해 맞춤 제작된 데이터 서비스",
      feature1: {
        title: "실시간 토큰 가격",
        desc: "5개 주요 체인의 실시간 DEX 가격 조회, 유동성 및 거래량 데이터 지원"
      },
      feature2: {
        title: "크로스체인 가격 집계",
        desc: "여러 체인의 가격 자동 비교, 차익거래 기회 식별, 최적의 DEX 추천"
      },
      feature3: {
        title: "유동성 풀 분석",
        desc: "TVL, APY, 거래량, 비영구적 손실 등 완전한 유동성 풀 데이터"
      },
      feature4: {
        title: "고래 거래 모니터링",
        desc: "대규모 거래 실시간 모니터링, 맞춤형 임계값 및 거래 유형 설정 가능"
      },
      feature5: {
        title: "계약 보안 스캔",
        desc: "스마트 계약 위험 점수, 허니팟 탐지, 프록시 계약 식별"
      },
      feature6: {
        title: "x402 마이크로페이먼트",
        desc: "계정 불필요, 구독 불필요 - AI 에이전트가 자율적으로 결정하고 지불"
      },
      instant: "즉시 결제"
    },

    pricing: {
      title: "간단하고 투명한 가격",
      subtitle: "가장 적합한 플랜을 선택하세요",
      popular: "가장 인기있는",
      perMonth: "/월",
      btnFree: "시작하기",
      btnStart: "지금 구독",
      btnPro: "지금 구독",
      btnEnterprise: "문의하기",
      tier: {
        free: {
          name: "무료",
          features: [
            "10회/일 호출",
            "모든 API 액세스",
            "커뮤니티 지원",
            "SLA 보장 없음"
          ]
        },
        starter: {
          name: "스타터",
          features: [
            "10,000회/월 호출",
            "모든 API 액세스",
            "할인 가격",
            "이메일 지원"
          ]
        },
        pro: {
          name: "프로",
          features: [
            "100,000회/월 호출",
            "모든 API 액세스",
            "최대 할인 (30%)",
            "우선 지원",
            "99.9% SLA"
          ]
        },
        enterprise: {
          name: "엔터프라이즈",
          price: "맞춤형",
          features: [
            "무제한 호출",
            "전용 할인 (최대 70%)",
            "맞춤형 기능",
            "전담 지원",
            "99.99% SLA"
          ]
        }
      }
    },

    apiDocs: {
      title: "API 문서",
      subtitle: "간단하고 사용하기 쉬운 MCP 인터페이스",
      viewFull: "전체 API 문서 보기"
    },

    quickstart: {
      title: "5분 만에 빠른 시작",
      step1: {
        title: "리포지토리 복제",
        code: "git clone https://github.com/your-repo/x402-mcp-server\ncd x402-mcp-server"
      },
      step2: {
        title: "의존성 설치",
        code: "npm install\nnpm run build"
      },
      step3: {
        title: "서버 시작",
        code: "npm start\n# 또는 시작 스크립트 사용\n./start.sh"
      },
      step4: {
        title: "호출 시작",
        code: "# 예제 실행\npython3 examples/simple-agent-example.py"
      }
    },

    networks: {
      title: "지원되는 블록체인 네트워크"
    },

    cta: {
      title: "시작할 준비가 되셨나요?",
      subtitle: "지금 x402 AI 에이전트 데이터 서비스를 시작하세요",
      btnPrimary: "무료 시작",
      btnSecondary: "GitHub 보기"
    },

    footer: {
      product: "제품",
      resources: "리소스",
      community: "커뮤니티",
      about: "소개",
      description: "AI 에이전트를 위해 설계된 최초의 온체인 데이터 서비스 플랫폼",
      poweredBy: "x402 프로토콜 기반 🤖⚡💰",
      copyright: "© 2024 x402 Data Service. All rights reserved.",
      contactUs: "문의하기"
    }
  },

  ja: {
    nav: {
      features: "機能",
      pricing: "料金",
      api: "APIドキュメント",
      quickstart: "クイックスタート",
      github: "GitHub"
    },

    hero: {
      title1: "AIエージェントのための",
      title2: "オンチェーンデータサービス",
      subtitle: "x402マイクロペイメントプロトコルにより、AIエージェントがリアルタイムオンチェーンデータに自律的にアクセス<br/>アカウント、サブスクリプション、複雑な統合は不要 - 従量課金、$0.0003/呼び出しから",
      btnPrimary: "始める",
      btnSecondary: "ドキュメントを見る",
      stat1: "APIツール",
      stat2: "サポートチェーン",
      stat3: "開始価格"
    },

    features: {
      title: "コア機能",
      subtitle: "AIエージェントのためにカスタマイズされたデータサービス",
      feature1: {
        title: "リアルタイムトークン価格",
        desc: "5つの主要チェーンでのリアルタイムDEX価格クエリ、流動性と取引量データをサポート"
      },
      feature2: {
        title: "クロスチェーン価格集約",
        desc: "複数チェーンの価格を自動比較、アービトラージ機会を特定、最適なDEXを推奨"
      },
      feature3: {
        title: "流動性プール分析",
        desc: "TVL、APY、取引量、インパーマネントロスなど、完全な流動性プールデータ"
      },
      feature4: {
        title: "クジラ取引監視",
        desc: "大規模取引のリアルタイム監視、カスタマイズ可能な閾値と取引タイプ"
      },
      feature5: {
        title: "コントラクトセキュリティスキャン",
        desc: "スマートコントラクトリスクスコアリング、ハニーポット検出、プロキシコントラクト識別"
      },
      feature6: {
        title: "x402マイクロペイメント",
        desc: "アカウント不要、サブスクリプション不要 - AIエージェントが自律的に決定し支払い"
      },
      instant: "即時決済"
    },

    pricing: {
      title: "シンプルで透明な料金",
      subtitle: "最適なプランをお選びください",
      popular: "最も人気",
      perMonth: "/月",
      btnFree: "始める",
      btnStart: "今すぐ登録",
      btnPro: "今すぐ登録",
      btnEnterprise: "お問い合わせ",
      tier: {
        free: {
          name: "無料",
          features: [
            "10回/日の呼び出し",
            "すべてのAPIアクセス",
            "コミュニティサポート",
            "SLA保証なし"
          ]
        },
        starter: {
          name: "スターター",
          features: [
            "10,000回/月の呼び出し",
            "すべてのAPIアクセス",
            "割引価格",
            "メールサポート"
          ]
        },
        pro: {
          name: "プロ",
          features: [
            "100,000回/月の呼び出し",
            "すべてのAPIアクセス",
            "最大割引（30%）",
            "優先サポート",
            "99.9% SLA"
          ]
        },
        enterprise: {
          name: "エンタープライズ",
          price: "カスタム",
          features: [
            "無制限の呼び出し",
            "専用割引（最大70%）",
            "カスタム機能",
            "専任サポート",
            "99.99% SLA"
          ]
        }
      }
    },

    apiDocs: {
      title: "APIドキュメント",
      subtitle: "シンプルで使いやすいMCPインターフェース",
      viewFull: "完全なAPIドキュメントを見る"
    },

    quickstart: {
      title: "5分でクイックスタート",
      step1: {
        title: "リポジトリをクローン",
        code: "git clone https://github.com/your-repo/x402-mcp-server\ncd x402-mcp-server"
      },
      step2: {
        title: "依存関係をインストール",
        code: "npm install\nnpm run build"
      },
      step3: {
        title: "サーバーを起動",
        code: "npm start\n# またはスタートアップスクリプトを使用\n./start.sh"
      },
      step4: {
        title: "呼び出しを開始",
        code: "# 例を実行\npython3 examples/simple-agent-example.py"
      }
    },

    networks: {
      title: "サポートされているブロックチェーンネットワーク"
    },

    cta: {
      title: "始める準備はできましたか？",
      subtitle: "今すぐx402 AIエージェントデータサービスを始めましょう",
      btnPrimary: "無料で始める",
      btnSecondary: "GitHubを見る"
    },

    footer: {
      product: "製品",
      resources: "リソース",
      community: "コミュニティ",
      about: "について",
      description: "AIエージェントのために設計された最初のオンチェーンデータサービスプラットフォーム",
      poweredBy: "x402プロトコル提供 🤖⚡💰",
      copyright: "© 2024 x402 Data Service. All rights reserved.",
      contactUs: "お問い合わせ"
    }
  }
};

// 导出翻译对象
if (typeof module !== 'undefined' && module.exports) {
  module.exports = translations;
}
