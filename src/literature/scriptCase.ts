import type { LiteratureCase } from "./types";

// Original spoken-copy cells preserved verbatim; references researched online on 2026-10-27.
export const scriptCase: LiteratureCase = {
  id: "ning-weight-management-v1",
  kind: "script",
  title: "宁博士 · 减重科普脚本",
  subtitle: "13 段原稿 · 11 条真实来源 · 逐段核对",
  source:
    "AI Content Creation - POC Files - 20261023.docx → 第二份内嵌 Word → 口播表",
  sourceFile: "/literature/ning-original.docx",
  sourceNote:
    "口播原文、源编号、时长、画面与花字保持不变。2026-10-27 已按第2–12段的具体主张联网检索原始研究及官方指南；全文、摘要和官方文件的核对层级分别标注。第1段为提问无需引用，第13段效果表述仍缺直接依据。当前页面在本地展示保存的检索结果，不执行实时检索。",
  version: "2026-10-27 · 联网文献核对 v2",
  segments: [
    {
      id: "ning-01",
      sourceNumber: "1",
      duration: "5.12",
      visual: "博主出镜口播穿插减脂餐素材+肚子游泳圈素材",
      original:
        "天天吃低脂餐，水煮菜吃到脸都绿了，为什么肚子上的肉还是稳如泰山？",
      caption: "",
      title: "从减重困惑切入",
      revised:
        "认真调整饮食，为什么腰围变化仍不明显？体重管理，究竟还要关注哪些方面？",
      reason:
        "保留提问式开场，去掉夸张描述。此段是情境引入，不把问题句包装为医学结论。",
      status: "not-needed",
      claims: ["修辞性提问：调整饮食后仍有减重困惑"],
      keywords: ["减重困惑", "情境引入"],
      evidence: [],
    },
    {
      id: "ning-02",
      sourceNumber: "2",
      duration: "12",
      visual: "博主出镜口播穿插运动素材",
      original:
        "很多人都有过这样的经历：为了减重，低脂餐、断糖、轻断食、代餐轮番尝试，吃得越来越少，体重却不怎么变化；好不容易瘦下来，一恢复正常饮食，体重又慢慢反弹。",
      caption: "",
      title: "平台期与体重回升",
      revised:
        "你是否遇到过这样的困惑：调整饮食后，体重变化逐渐放缓；减下来的体重，后来又有所回升。出现这些情况，先别急着责怪自己。",
      reason:
        "可支持回升现象；饮食方式清单、吃得越少越难瘦及恢复饮食的因果关系尚不受这些研究完整支持。",
      status: "partial",
      claims: [
        "部分人减重后出现体重回升",
        "不同饮食方式及回升原因不能一概而论",
      ],
      keywords: ["weight regain", "weight maintenance"],
      evidence: [
        {
          referenceId: "ning-sacks-2009",
          locator:
            "PubMed Abstract / Methods及Results，6个月与12个月以后的组均体重轨迹",
          support:
            "对应原句“好不容易瘦下来……体重又慢慢反弹”中的体重回升现象；较大随机试验提供比竞赛小样本更接近一般饮食管理的背景。",
          boundary:
            "未证明“一恢复正常饮食”就是原因，也未验证原句列出的全部方法均无效；体重回升不等于完全回到基线。",
        },
        {
          referenceId: "ning-fothergill-2016",
          locator:
            "Wiley Results / Body weight and composition；Table 1与Figure 2说明",
          support: "补充长期随访中出现不同程度体重回升的实例。",
          boundary:
            "仅为14名竞赛参与者，不用于估计普通人的反弹概率，也不能把现象归因于恢复正常饮食。",
        },
      ],
    },
    {
      id: "ning-03",
      sourceNumber: "3",
      duration: "11.36",
      visual: "博主出镜口播",
      original:
        "其实，这背后不一定只是“吃多了”或者“不够自律”。这可能是身体在抵抗。当我们长期通过极端节食、过度控制饮食来减重时，身体可能会启动一种保护机制",
      caption: "不是不自律是身体在抵抗",
      title: "解释减重后的适应性变化",
      revised:
        "体重变化受多种因素影响。部分减重研究观察到，体重下降后，能量消耗和食欲调节会出现适应性变化；具体原因仍需结合饮食、活动和健康状况评估。",
      reason: "可说明能耗和食欲适应；“长期极端节食启动保护机制”仍需收窄表达。",
      status: "partial",
      claims: ["减重后可能出现能量消耗适应", "减重后可能出现食欲调节变化"],
      keywords: ["metabolic adaptation", "appetite adaptation"],
      evidence: [
        {
          referenceId: "ning-leibel-1995",
          locator: "PubMed Abstract / Methods、Results、Conclusions",
          support:
            "对应“身体可能出现适应性变化”中的能耗变化部分，可将拟人化的“身体在抵抗”改为补偿性能耗变化。",
          boundary:
            "实验未定义原稿“长期极端节食”的范围；不能将其写成所有平台期的唯一机制或必然结果。",
        },
        {
          referenceId: "ning-sumithran-2011",
          locator: "PubMed Abstract / Methods与Results",
          support: "对应适应性变化中的食欲相关激素与主观食欲部分。",
          boundary:
            "仅在特定饮食干预人群中观察，不支持把所有体重困难都归为统一的“保护机制”。",
        },
      ],
    },
    {
      id: "ning-04",
      sourceNumber: "4",
      duration: "8",
      visual:
        "博主口播手机画面演示：滑动展示礼来小程序内“身体抵抗机制——节能模式”科普页面",
      original:
        "一方面，身体会进入“节能模式”，主动降低日常能量消耗，就像手机开启省电模式一样，让减重越来越难突破。",
      caption: "保护机制一：节能模式",
      title: "“节能模式”的表达边界",
      revised:
        "在部分接受减重干预的人群中，研究观察到了静息能量消耗的适应性下降。可以通俗地比作“更省电”，但变化程度存在个体差异，不能解释每个人的平台期。",
      reason:
        "可支持部分人群能耗适应；省电比喻与每个人的平台期因果判断需保留边界。",
      status: "partial",
      claims: ["部分人减重后静息能量消耗下降", "手机省电模式仅为类比"],
      keywords: ["resting metabolic rate", "adaptive thermogenesis"],
      evidence: [
        {
          referenceId: "ning-leibel-1995",
          locator: "PubMed Abstract / Results：总、静息和非静息能量消耗",
          support:
            "对应“能量消耗降低”部分；该研究实际测量的范围包含总能耗，不只静息能耗。",
          boundary:
            "“省电模式”是比喻；小样本不能证明每个人都会持续下降，不能直接推出平台期一定由此造成。",
        },
        {
          referenceId: "ning-fothergill-2016",
          locator:
            "Wiley Methods / Statistical analysis；Results / RMR and metabolic adaptation；Figure 5；Discussion",
          support: "对应体成分校正后的静息代谢适应可持续存在。",
          boundary:
            "静息能耗不等同全天总能耗；赛末适应与6年回升未显著相关，不应改写成“代谢越低越会反弹”。",
        },
      ],
    },
    {
      id: "ning-05",
      sourceNumber: "5",
      duration: "6.4",
      visual:
        "博主口播手机画面演示：展示礼来小程序内“进食模式”与激素影响食欲相关图文",
      original:
        "另一方面，身体还可能增强进食信号，让饥饿感变得更明显，更容易出现想吃东西的冲动。",
      caption: "保护机制二：进食模式",
      title: "食欲与饥饿感",
      revised:
        "一项饮食减重研究发现，部分食欲相关激素和主观饥饿感的变化，在初次减重一年后仍可观察到。这提示长期体重管理也需要关注食欲变化。",
      reason:
        "支持特定干预后的食欲及饥饿感变化，不直接验证所有人的进食冲动或实际行为。",
      status: "partial",
      claims: [
        "特定饮食减重后食欲相关激素发生变化",
        "该研究观察到饥饿感变化持续至一年后",
      ],
      keywords: ["hunger", "leptin", "ghrelin", "diet-induced weight loss"],
      evidence: [
        {
          referenceId: "ning-sumithran-2011",
          locator:
            "PubMed Abstract / Results：第10周与第62周激素及主观食欲、饥饿感",
          support: "对应原句“饥饿感变得更明显”及部分食欲信号发生变化。",
          boundary:
            "主观食欲测量不等于实际进食量或暴食行为；未验证小程序进食模式分类，不能扩展为人人都会失控进食。",
        },
      ],
    },
    {
      id: "ning-06",
      sourceNumber: "6",
      duration: "14.88",
      visual: "博主出镜口播",
      original:
        "所以，减重真正困难的地方，不只是“少吃”，而是要找到身体能够长期适应的方法。很多人减重时还有一个误区，就是只盯着体重秤上的数字。但减重不是数字越低越好，更重要的是——你减掉的到底是什么。",
      caption: "减重不只是“少吃”",
      title: "评价减重不只看体重",
      revised:
        "减重不只看体重秤上的数字，也需要关注脂肪量、肌肉力量和身体功能的变化。具体方案还应考虑能否长期坚持。",
      reason:
        "体成分与功能部分有试验支持；“身体能够长期适应”不是上述试验直接测量的结局。",
      status: "partial",
      claims: [
        "体重数字不足以单独评价体成分变化",
        "原稿关于身体长期适应方法的表述尚未得到直接验证",
      ],
      keywords: ["body composition", "体成分", "体重管理评价"],
      evidence: [
        {
          referenceId: "ning-villareal-2017",
          locator:
            "Table 2：Body weight、Lean mass、Physical Performance Test；原刊 p.1950",
          support:
            "体重下降相近的运动组，瘦体重与功能变化存在差异；可支持同时评估体成分和功能。",
          boundary: "限上述老年人群；不证明某方法能被所有人的身体长期适应。",
        },
        {
          referenceId: "ning-longland-2016",
          locator: "PubMed Abstract → Design / Results",
          support:
            "短期减重中的脂肪量与瘦体重变化可以不同，支持关注减掉的成分。",
          boundary: "特殊运动和膳食干预，不能泛化为普通人的长期方案。",
        },
      ],
    },
    {
      id: "ning-07",
      sourceNumber: "7",
      duration: "6.72",
      visual: "博主出镜口播穿插cg动画原理",
      original:
        "如果只是减少水分和肌肉，体重虽然下降了，但身体代谢状态和生活质量可能并没有真正改善。",
      caption: "别掉进“只掉水分肌肉”的陷阱",
      title: "体成分与功能需分别评估",
      revised:
        "体重下降并不直接说明减掉了多少脂肪，也不能单凭这个数字判断健康是否改善；还需要结合体成分、力量和相关健康指标评估。",
      reason:
        "保留评估维度的提示，删除未获直接支持的“只掉水分肌肉→代谢和生活质量未改善”因果链；标题也宜相应调整。",
      status: "partial",
      claims: ["体重与瘦体重变化是不同指标", "身体功能需单独评估"],
      keywords: ["lean mass", "physical function", "body composition"],
      evidence: [
        {
          referenceId: "ning-villareal-2017",
          locator:
            "Table 2；p.1949 Strength, Balance, Gait, and Quality of Life",
          support: "提供体成分、身体功能及生活质量应分别评估的背景。",
          boundary:
            "未设置“只减水分和肌肉”组；不能证实原句因果关系。试验中瘦体重减少与功能改善可以同时发生。",
        },
        {
          referenceId: "ning-nedeltcheva-2010",
          locator:
            "PubMed / 原刊 Abstract → Measurements / Results / Limitation",
          support: "睡眠条件可影响减重时脂肪与去脂体重的变化。",
          boundary:
            "去脂体重不能等同肌肉，睡眠机会不等于实测睡眠；摘要不支持“只减水分肌肉就没有生活质量改善”。",
        },
      ],
    },
    {
      id: "ning-08",
      sourceNumber: "8",
      duration: "9.12",
      visual: "博主出镜口播穿插cg动画原理",
      original:
        "因为肌肉是维持代谢平衡、支撑日常活动的重要组织。减重，不只是“瘦下来”，还要尽可能守住肌肉，让身体保持更好的状态。",
      caption: "",
      title: "关注肌肉与日常功能",
      revised:
        "减重时，也要关注肌肉力量和身体功能。部分试验提示，适当的抗阻训练和营养安排有助于减少瘦体重损失；具体安排需结合个人情况。",
      reason:
        "以可定位的干预结果替换含义宽泛的“维持代谢平衡”；不同年龄、疾病和训练条件不能直接互推。",
      status: "partial",
      claims: [
        "减重管理中值得关注瘦体重和身体功能",
        "不同运动方案的影响应结合人群判断",
      ],
      keywords: [
        "resistance exercise",
        "older adults",
        "lean mass preservation",
      ],
      evidence: [
        {
          referenceId: "ning-villareal-2017",
          locator:
            "p.1949 Strength, Balance, Gait, and Quality of Life；Table 2",
          support:
            "支持在该老年肥胖人群减重时纳入抗阻训练，并关注力量与身体功能。",
          boundary:
            "干预并未完全防止瘦体重下降，也没有直接检验泛指的“代谢平衡”。",
        },
        {
          referenceId: "ning-longland-2016",
          locator: "PubMed Abstract → Results",
          support: "该试验条件下，较高蛋白组的瘦体重保留结果更有利。",
          boundary:
            "瘦体重不是骨骼肌专属指标；不应把试验剂量和强度直接推荐给公众，也未证明额外功能获益。",
        },
      ],
    },
    {
      id: "ning-09",
      sourceNumber: "9",
      duration: "11.04",
      visual:
        "博主口播手机画面演示：滑动展示礼来小程序内“卫健委腰围新标准及中心性肥胖”页面",
      original:
        "同时，也不要忽视身体里那些“看不见的变化”！根据国家卫健委发布的相关标准，男性腰围≥90cm，女性腰围≥85cm，就需要关注腹型肥胖问题。",
      caption: "卫健委腰围标准：男≥90cm / 女≥85cm",
      title: "明确腰围标准的适用范围",
      revised:
        "依据国家卫生健康委《肥胖症诊疗指南（2024年版）》，中国成年人男性腰围≥90cm、女性≥85cm，是判断中心性肥胖的腰围界值。测量应规范，健康风险还需结合其他指标评估。",
      reason:
        "补齐指南名称、年份与中国成年人限定；保留数值，避免被理解为适用于所有年龄和人群的单一诊断。",
      status: "supported",
      claims: ["中国成人中心性肥胖腰围界值：男性≥90cm，女性≥85cm"],
      keywords: ["中国成年人", "中心性肥胖", "腰围90cm85cm"],
      evidence: [
        {
          claim: "成人中心性肥胖腰围界值",
          referenceId: "ning-nhc-obesity-2024",
          locator:
            "PDF第6页（印刷第6页），四（二）2.基于体型特征的诊断标准；测量方法见PDF第53页附件1",
          support: "中国成人男性≥90cm、女性≥85cm为中心性肥胖界值。",
          boundary:
            "限成人并须规范测量；不是儿童标准或个人全部健康风险的判断。",
        },
        {
          claim: "成人腰围标准的官方附表交叉核对",
          referenceId: "ning-nhc-weight-management-2024",
          locator: "PDF第17页（印刷第17页），附表2；成人分类语境见第2页",
          support: "附表分别列出男女成人腰围的中心型肥胖前期与中心型肥胖界值。",
          boundary: "需与正常/前期范围区分；不能套用后续儿童章节。",
        },
      ],
    },
    {
      id: "ning-10",
      sourceNumber: "10",
      duration: "10.08",
      visual:
        "博主口播手机画面演示：展示礼来小程序内“肥胖并发症（OSA、血糖异常、心血管疾病）”科普页面",
      original:
        "因为肥胖并不只是外形问题，它本身是一种慢性疾病，肥胖还会增加OSA（阻塞性睡眠呼吸暂停）、血糖异常、心血管疾病等相关健康风险。",
      caption: "肥胖是一种慢性疾病",
      title: "慢性疾病与相关风险",
      revised:
        "肥胖症是一种慢性疾病，与阻塞性睡眠呼吸暂停、血糖异常和心血管疾病等风险相关。具体风险因人而异，应结合个人情况评估。",
      reason:
        "保留指南可对应的风险提示，用“相关”表达群体层面关系，不暗示所有患者都会发生这些疾病。",
      status: "supported",
      claims: ["肥胖症的慢性疾病属性", "与血糖异常、OSA及心血管疾病相关"],
      keywords: ["肥胖症", "OSA", "血糖异常", "心血管风险"],
      evidence: [
        {
          claim: "肥胖症的慢性疾病属性",
          referenceId: "ning-nhc-obesity-2024",
          locator: "PDF第1页（印刷第1页），一、概述",
          support: "指南将肥胖症列为慢性疾病中的独立病种。",
          boundary: "不等于每位患者均发生所有并发症。",
        },
        {
          claim: "与血糖异常相关",
          referenceId: "ning-nhc-obesity-2024",
          locator: "PDF第10–11页（印刷同页码），四（五）1.血糖异常",
          support: "指南说明超重肥胖与糖尿病前期、2型糖尿病风险相关。",
          boundary: "本段不据此推算个人风险或绝对患病率。",
        },
        {
          claim: "与阻塞性睡眠呼吸暂停相关",
          referenceId: "ning-nhc-obesity-2024",
          locator:
            "PDF第15页（印刷第15页），四（五）5.阻塞性睡眠呼吸暂停综合征",
          support: "指南把肥胖尤其中心性肥胖列为OSAS重要危险因素。",
          boundary: "不能把特定重度肥胖/手术样本人群的比例推广到所有人。",
        },
        {
          claim: "与心血管疾病相关",
          referenceId: "ning-nhc-obesity-2024",
          locator: "PDF第17页（印刷第17页），四（五）7.心血管疾病",
          support: "指南将肥胖症列为心血管疾病独立危险因素。",
          boundary: "具体结局和个体风险需另行评估，不能以此承诺任何产品效果。",
        },
        {
          claim: "睡眠呼吸障碍关联的原始研究补充",
          referenceId: "ning-peppard-2000",
          locator:
            "JAMA HTML全文：Methods—Participants；Results—Tables 2、3；Comment—limitations",
          support:
            "690人约4年随访中，体重增加与AHI上升及中重度SDB分类发生相关；10%增重对应AHI约升32%（95%CI20%–45%）。",
          boundary:
            "美国在职成人观察性队列，非随机治疗试验；结局是SDB/AHI，不等同所有OSA临床结局；不外推超过±20%的体重变化，也不支持血糖/心血管条目。",
        },
      ],
    },
    {
      id: "ning-11",
      sourceNumber: "11",
      duration: "8",
      visual: "博主出镜口播",
      original:
        "所以，科学减重不是一味挨饿，也不是追求短期体重下降。饮食调整、规律运动、良好作息，是体重管理的基础。",
      caption: "",
      title: "生活方式管理的基础",
      revised:
        "体重管理需要关注合理饮食、规律运动和睡眠，避免盲目采取极端做法。有基础疾病或特殊身体状况时，应接受专业指导。",
      reason:
        "保留可执行的生活方式原则，补充个体评估，避免把同一种饮食或运动安排推广给所有人。",
      status: "supported",
      claims: ["体重管理应综合饮食、运动与睡眠", "特殊健康情况需专业指导"],
      keywords: ["合理膳食", "规律运动", "睡眠", "专业指导"],
      evidence: [
        {
          referenceId: "ning-nedeltcheva-2010",
          locator: "PubMed / 原刊 Abstract → Intervention / Results",
          support: "为体重管理中关注睡眠提供短期实验依据。",
          boundary: "不能推定长期疗效或适用于全部人群。",
        },
        {
          referenceId: "ning-tasali-2022",
          locator: "Methods；Table 2；Strengths and Limitations",
          support: "在习惯短睡眠的超重青年成人中，改善睡眠可影响短期能量摄入。",
          boundary:
            "未指定饮食或运动；不足以单独支持整套生活方式建议。长期减脂与维持效果未被该试验证实，不能把模型预测当成实测结果。",
        },
        {
          claim: "合理饮食",
          referenceId: "ning-nhc-weight-management-2024",
          locator: "PDF第5页，三（一）1.膳食干预；第10页，四（二）合理膳食",
          support: "指南强调均衡膳食及结合个体情况调整。",
          boundary: "属于管理原则，不构成可直接照搬的个体营养处方。",
        },
        {
          claim: "规律且适合个体的身体活动",
          referenceId: "ning-nhc-weight-management-2024",
          locator: "PDF第7页，三（一）2.运动干预；第10页，四（三）适量运动",
          support: "运动应渐进并结合年龄、健康状况与能力；高危者需专业方案。",
          boundary: "不为所有人指定同一强度或保证减重效果。",
        },
        {
          claim: "良好睡眠习惯",
          referenceId: "ning-nhc-weight-management-2024",
          locator: "PDF第9页，四、健康体重的管理与维持",
          support: "健康体重管理框架包括良好睡眠习惯。",
          boundary: "原则性建议，未证明仅改善睡眠即可减重。",
        },
      ],
    },
    {
      id: "ning-12",
      sourceNumber: "12",
      duration: "18.72",
      visual:
        "手机画面演示：展示在礼来小程序/App内点击“问诊咨询/查找内分泌科及减重门诊”页面",
      original:
        "但每个人的身体情况不同，如果已经出现腰围超标、长期减重困难，或者尝试多种方式仍无法改善，建议有需要的肥胖症患者及时前往正规医疗机构进行规范化管理，在专业指导下选择适合自己的体重管理方案，包括生活方式干预、药物治疗或其他规范化管理方式~",
      caption: "线上问诊咨询前往内分泌科或专业减重门诊",
      title: "就医评估与规范管理",
      revised:
        "腰围超标或长期体重管理困难时，可到正规医疗机构寻求评估。医生会结合体重、相关疾病和既往干预情况制定方案；是否需要药物等治疗，应依据适应证和个体评估决定。",
      reason:
        "保留就医引导，补充治疗选择的条件；不把腰围超标直接等同于需要药物，也不为未经验证的平台功能背书。",
      status: "supported",
      claims: [
        "个体化方案需要评估既往干预及健康状况",
        "治疗手段需根据适用条件选择",
      ],
      keywords: ["个体化评估", "规范化管理", "治疗适应证"],
      evidence: [
        {
          claim: "个体评估和共同制定方案",
          referenceId: "ning-nhc-obesity-2024",
          locator: "PDF第19–24页，五、肥胖症的评估；六、肥胖症的治疗原则",
          support:
            "需了解既往减重、疾病和生活方式，结合风险设定方案并共同决策。",
          boundary: "不等于特定小程序已具备或验证这些诊疗服务。",
        },
        {
          claim: "药物使用需要条件与评估",
          referenceId: "ning-nhc-obesity-2024",
          locator: "PDF第33–34页，十、药物治疗及（一）减重药物的适应证",
          support:
            "药物治疗前应评估适应证、禁忌证和病情，并随访安全性与有效性。",
          boundary:
            "不能仅凭腰围超标决定用药；具体药物适用信息须按最新批准文件核对。",
        },
        {
          claim: "生活方式与医学治疗的递进关系",
          referenceId: "ning-nhc-weight-management-2024",
          locator:
            "PDF第4页，三、超重肥胖的干预和治疗；第8–9页，三（二）医学治疗",
          support: "综合生活方式是基础；额外治疗需评估并满足相应条件。",
          boundary: "本次没有为任何个人推荐药物或手术。",
        },
      ],
    },
    {
      id: "ning-13",
      sourceNumber: "13",
      duration: "6.08",
      visual: "博主出镜口播",
      original:
        "减重不是和身体硬碰硬，而是找到适合自己的方法，让身体少抵抗，健康状态更稳定。",
      caption: "身体少抵抗，健康更稳定",
      title: "结尾去除未定义的效果承诺",
      revised:
        "体重管理不必成为和自己的较量。把注意力放在可坚持的习惯、定期评估和必要的专业支持上，逐步找到适合自己的管理方式。",
      reason:
        "“身体少抵抗、健康更稳定”未定义可测量结局，当前未找到能直接支持该完整承诺的证据；建议改为行动引导。",
      status: "pending",
      claims: ["“身体少抵抗、健康更稳定”的完整效果表述尚缺直接依据"],
      keywords: ["结尾表达", "效果承诺", "待核对"],
      evidence: [],
    },
  ],
  references: [
    {
      id: "ning-sacks-2009",
      label: "NEJM · 两年饮食随机试验",
      title:
        "Comparison of weight-loss diets with different compositions of fat, protein, and carbohydrates",
      authors: "Sacks FM, Bray GA, Carey VJ, et al.",
      publication: "N Engl J Med. 2009;360(9):859–873.",
      year: 2009,
      doi: "10.1056/NEJMoa0804748",
      pmid: "19246357",
      url: "https://pubmed.ncbi.nlm.nih.gov/19246357/",
      verified: true,
      verificationNote:
        "已打开 PubMed 完整摘要和 Harvard 官方存储记录；PMC 为验证码页，NEJM 返回403，Harvard PDF入口未成功读取，故仅标摘要核对。",
      scope:
        "811名超重成年人随机接受4种宏量营养素比例的减能量饮食并获2年指导。组均体重在前6个月下降、12个月后回升，支持长期管理中可出现回升。",
      retrievedAt: "2026-10-27",
      verificationLevel: "abstract",
      checkedSections: [
        "PubMed：书目、Abstract Methods、Results、Conclusions",
        "Harvard DASH：书目与摘要交叉核对",
      ],
    },
    {
      id: "ning-leibel-1995",
      label: "NEJM · 体重改变与能耗",
      title: "Changes in energy expenditure resulting from altered body weight",
      authors: "Leibel RL, Rosenbaum M, Hirsch J",
      publication: "N Engl J Med. 1995;332(10):621–628.",
      year: 1995,
      doi: "10.1056/NEJM199503093321001",
      pmid: "7632212",
      url: "https://pubmed.ncbi.nlm.nih.gov/7632212/",
      verified: true,
      verificationNote:
        "已打开 PubMed 完整摘要；本轮NEJM正文和PDF均返回403。另检索到原刊勘误涉及Table 2行对齐，未采用该表的数值；不标为全文核对。",
      scope:
        "41名受试者在受控体重改变后的重复测量，支持维持减低体重时总能耗以及静息、非静息能耗出现补偿性下降。",
      retrievedAt: "2026-10-27",
      verificationLevel: "abstract",
      checkedSections: [
        "PubMed：书目、Abstract Methods、Results、Conclusions",
        "PubMed：Erratum in",
        "NEJM勘误：检索返回的更正说明",
      ],
    },
    {
      id: "ning-fothergill-2016",
      label: "Obesity · 静息代谢六年随访",
      title:
        'Persistent metabolic adaptation 6 years after "The Biggest Loser" competition',
      authors: "Fothergill E, Guo J, Howard L, et al.",
      publication: "Obesity (Silver Spring). 2016;24(8):1612–1619.",
      year: 2016,
      doi: "10.1002/oby.21538",
      pmid: "27136388",
      url: "https://onlinelibrary.wiley.com/doi/10.1002/oby.21538",
      verified: true,
      verificationNote:
        "已打开并核对Wiley正文所列方法、结果、表1、图5说明及讨论。PMC验证码页未使用；未把其他论文或作者推测当成本研究直接结果。",
      scope:
        "14名参加高强度饮食与运动减重竞赛的受试者随访6年。观察到体重回升与持续的静息代谢适应，但赛末代谢适应与随后回升未显著相关。",
      retrievedAt: "2026-10-27",
      verificationLevel: "full-text",
      checkedSections: [
        "PubMed：书目与摘要",
        "Wiley：Methods / Resting metabolic rate、Statistical analysis",
        "Wiley：Results / Body weight and composition、RMR and metabolic adaptation、Table 1、Figure 5",
        "Wiley：Discussion",
      ],
    },
    {
      id: "ning-sumithran-2011",
      label: "NEJM · 饮食减重与食欲",
      title: "Long-term persistence of hormonal adaptations to weight loss",
      authors: "Sumithran P, Prendergast LA, Delbridge E, et al.",
      publication: "N Engl J Med. 2011;365(17):1597–1604.",
      year: 2011,
      doi: "10.1056/NEJMoa1105816",
      pmid: "22029981",
      url: "https://pubmed.ncbi.nlm.nih.gov/22029981/",
      verified: true,
      verificationNote:
        "本轮已重新打开PubMed完整摘要。NEJM正文直连返回403；搜索返回的部分正文未作为全文核对依据。",
      scope:
        "50名无糖尿病的超重或肥胖受试者接受10周极低能量饮食。测量激素与主观食欲，观察至第62周，支持特定干预后食欲相关变化可能持续。",
      retrievedAt: "2026-10-27",
      verificationLevel: "abstract",
      checkedSections: ["PubMed：书目、Abstract Methods、Results、Conclusions"],
    },
    {
      id: "ning-villareal-2017",
      label: "NEJM · 老年肥胖运动试验",
      title:
        "Aerobic or Resistance Exercise, or Both, in Dieting Obese Older Adults",
      authors: "Villareal DT, Aguirre L, Gurney AB, et al.",
      publication: "N Engl J Med. 2017;376(20):1943–1955.",
      year: 2017,
      doi: "10.1056/NEJMoa1616338",
      pmid: "28514618",
      url: "https://pubmed.ncbi.nlm.nih.gov/28514618/",
      verified: true,
      verificationNote:
        "实际打开波士顿大学公开保存的 NEJM 原刊 PDF，核对人群、方法、Table 2 及功能/生活质量结果；PMC 直开遇到验证页。原刊入口：https://sites.bu.edu/geriatricsfellowship/files/2019/07/Halpin_VillarealAerobic.pdf",
      scope:
        "160 名 ≥65 岁肥胖、久坐且有衰弱的成人；26 周饮食管理配合不同运动。抗阻或联合训练比单纯有氧减少瘦体重损失，联合组身体功能改善更大。",
      retrievedAt: "2026-10-27",
      verificationLevel: "full-text",
      checkedSections: [
        "原刊 p.1944 Participants",
        "p.1946 Body Composition / Quality of Life",
        "p.1949 Strength, Balance, Gait, and Quality of Life",
        "Table 2",
      ],
    },
    {
      id: "ning-longland-2016",
      label: "AJCN · 蛋白摄入与运动试验",
      title:
        "Higher compared with lower dietary protein during an energy deficit combined with intense exercise promotes greater lean mass gain and fat mass loss: a randomized trial",
      authors: "Longland TM, Oikawa SY, Mitchell CJ, Devries MC, Phillips SM.",
      publication: "Am J Clin Nutr. 2016;103(3):738–746.",
      year: 2016,
      doi: "10.3945/ajcn.115.119339",
      pmid: "26817506",
      url: "https://pubmed.ncbi.nlm.nih.gov/26817506/",
      verified: true,
      verificationNote:
        "实际打开并阅读 PubMed 完整摘要，核对 DOI、人数、干预及体成分结果；期刊全文直开返回 403，未标作全文核验。",
      scope:
        "40 名年轻男性，4 周约 40% 能量缺口、每周 6 天抗阻与高强度间歇训练。2.4 对比 1.2 g/kg/日蛋白组瘦体重变化为 +1.2 对 +0.1 kg，脂肪量为 −4.8 对 −3.5 kg；运动表现改善无组间差异。",
      retrievedAt: "2026-10-27",
      verificationLevel: "abstract",
      checkedSections: ["PubMed Abstract: Design", "PubMed Abstract: Results"],
    },
    {
      id: "ning-nedeltcheva-2010",
      label: "Ann Intern Med · 睡眠限制交叉试验",
      title:
        "Insufficient sleep undermines dietary efforts to reduce adiposity",
      authors: "Nedeltcheva AV, Kilkus JM, Imperial J, Schoeller DA, Penev PD.",
      publication: "Ann Intern Med. 2010;153(7):435–441.",
      year: 2010,
      doi: "10.7326/0003-4819-153-7-201010050-00006",
      pmid: "20921542",
      url: "https://pubmed.ncbi.nlm.nih.gov/20921542/",
      verified: true,
      verificationNote:
        "核对在线检索返回的原始 PubMed/期刊摘要与 DOI；直开 PubMed 未返回正文，PMC 为验证页，期刊为 403。仅摘要级，未核对全文。",
      scope:
        "10 名超重成人的两期交叉试验，每期 14 天限制能量并给予 8.5 或 5.5 小时睡眠机会。短睡眠条件减脂较少、去脂体重损失较多；小样本短期实验。",
      retrievedAt: "2026-10-27",
      verificationLevel: "abstract",
      checkedSections: [
        "检索返回的 PubMed / 原刊 Abstract: Design, Patients, Intervention, Results, Limitation",
      ],
    },
    {
      id: "ning-tasali-2022",
      label: "JAMA Intern Med · 睡眠延长试验",
      title:
        "Effect of Sleep Extension on Objectively Assessed Energy Intake Among Adults With Overweight in Real-life Settings: A Randomized Clinical Trial",
      authors: "Tasali E, Wroblewski K, Kahn E, Kilkus J, Schoeller DA.",
      publication: "JAMA Intern Med. 2022;182(4):365–374.",
      year: 2022,
      doi: "10.1001/jamainternmed.2021.8098",
      pmid: "35129580",
      url: "https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2788694",
      verified: true,
      verificationNote:
        "实际打开 JAMA 原刊全文，核对随机方案、客观能量摄入测算、Table 2 及局限。",
      scope:
        "80 名 21–40 岁、BMI 25.0–29.9 且习惯睡眠 <6.5 小时的成人。2 周睡眠延长较对照增加约 1.2 小时/夜，能量摄入差约 −270 kcal/日；总能量消耗无显著组间效应。",
      retrievedAt: "2026-10-27",
      verificationLevel: "full-text",
      checkedSections: [
        "Methods: Study Design, Setting, and Participants",
        "Methods: Assessments",
        "Table 2",
        "Discussion",
        "Strengths and Limitations",
      ],
    },
    {
      id: "ning-nhc-obesity-2024",
      title: "肥胖症诊疗指南（2024年版）",
      authors: "国家卫生健康委员会办公厅",
      publication: "国卫办医政函〔2024〕382号附件. 2024-10-12.",
      year: 2024,
      url: "https://www.nhc.gov.cn/cms-search/downFiles/c171fa2416864a21b69278fd04a33f21.pdf",
      verified: true,
      verificationNote:
        "已下载并核对国家卫生健康委官方79页PDF；对照下列章节和页码，未将文件发布等同于个体诊疗或文案审批。",
      scope:
        "中国肥胖症诊断、风险评估和分层管理；本次关联成人腰围及相关疾病、个体化治疗原则。",
      retrievedAt: "2026-10-27",
      verificationLevel: "official-document",
      checkedSections: [
        "PDF第1页＝印刷第1页：一、概述（慢性疾病属性）",
        "PDF第5–6页＝印刷第5–6页：四（二）诊断标准，尤其第6页“2.基于体型特征的诊断标准”",
        "PDF第10–11页＝印刷第10–11页：四（五）1.血糖异常",
        "PDF第15页＝印刷第15页：四（五）5.阻塞性睡眠呼吸暂停综合征",
        "PDF第17页＝印刷第17页：四（五）7.心血管疾病",
        "PDF第19–24页＝印刷第19–24页：五、肥胖症的评估；六、肥胖症的治疗原则",
        "PDF第33–34页＝印刷第33–34页：十、药物治疗及（一）减重药物的适应证",
        "PDF第53页＝印刷第53页：附件1“人体测量学指标测量及计算方法”",
      ],
      localUrl: "/literature/references/nhc-obesity-2024.pdf",
      label: "国家卫生健康委 · 官方文件",
    },
    {
      id: "ning-nhc-weight-management-2024",
      title: "体重管理指导原则（2024年版）",
      authors: "国家卫生健康委员会办公厅",
      publication: "国卫办医急函〔2024〕469号附件. 2024-12-05.",
      year: 2024,
      url: "https://www.nhc.gov.cn/wjw/c100378/202412/f3f58b54fbeb4c87b14164fac898bf08/files/1736390749000_59785.pdf",
      verified: true,
      verificationNote:
        "已读取并下载国家卫生健康委官方30页PDF；分别核对成人标准、膳食、运动、睡眠及医学治疗的章节。",
      scope:
        "健康体重维持和超重肥胖管理原则；成人、儿童、孕产妇等有独立适用章节。",
      retrievedAt: "2026-10-27",
      verificationLevel: "official-document",
      checkedSections: [
        "PDF第2–4页＝印刷第2–4页：一、分类标准；二、体重管理相关评估",
        "PDF第4–5页＝印刷第4–5页：三、超重肥胖的干预和治疗；（一）生活方式干预、1.膳食干预",
        "PDF第7–8页＝印刷第7–8页：三（一）2.运动干预及高危人群注意事项",
        "PDF第8–9页＝印刷第8–9页：三（二）医学治疗（药物和手术条件）",
        "PDF第9–10页＝印刷第9–10页：四、健康体重的管理与维持（含睡眠、合理膳食与适量运动）",
        "PDF第17页＝印刷第17页：附表2“根据腰围对成人中心型肥胖分类”",
      ],
      localUrl: "/literature/references/nhc-weight-management-2024.pdf",
      label: "国家卫生健康委 · 官方文件",
    },
    {
      id: "ning-peppard-2000",
      title:
        "Longitudinal Study of Moderate Weight Change and Sleep-Disordered Breathing",
      authors: "Peppard PE, Young T, Palta M, Dempsey J, Skatrud J",
      publication: "JAMA. 2000;284(23):3015–3021.",
      year: 2000,
      doi: "10.1001/jama.284.23.3015",
      pmid: "11122588",
      url: "https://jamanetwork.com/journals/jama/fullarticle/193382",
      verified: true,
      verificationNote:
        "已在JAMA公开全文核对作者、DOI、研究设计、结果表及局限；PubMed记录亦检索确认。",
      scope:
        "美国威斯康星州在职成年人队列690人，约4年随访；考察体重变化与睡眠呼吸障碍（SDB）严重程度和发生的关联。",
      retrievedAt: "2026-10-27",
      verificationLevel: "full-text",
      checkedSections: [
        "JAMA全文 Methods → Participants（690人、约4年随访、排除标准）",
        "JAMA全文 Methods → Data Collection（多导睡眠监测和AHI）",
        "JAMA全文 Results → Table 2（体重变化与AHI变化）",
        "JAMA全文 Results → Table 3（AHI≥15次/小时的新发分类）",
        "JAMA全文 Comment（随访缺失、体重变化±20%适用边界）",
      ],
      label: "JAMA · 纵向队列",
    },
  ],
  research: {
    performedAt: "2026-10-27",
    summary:
      "按固定原稿的减重维持、能量消耗、食欲、体成分、睡眠、腰围标准与疾病风险逐项联网检索，收录 11 条真实来源，形成 28 条主张与证据关联。官方文件相关页已下载核对，原始研究按全文或摘要实际可访问范围标记。",
    bibliographyUrl: "/literature/references/ning-references.ris",
    queries: [
      {
        query:
          "Leibel Rosenbaum Hirsch 1995 changes in energy expenditure resulting from altered body weight PubMed",
        source: "pubmed.ncbi.nlm.nih.gov",
        referenceIds: ["ning-leibel-1995"],
      },
      {
        query:
          "Sumithran Prendergast 2011 long-term persistence hormonal adaptations weight loss PubMed",
        source: "官方网站 / PubMed",
        referenceIds: [],
      },
      {
        query:
          "Fothergill 2016 Persistent metabolic adaptation Biggest Loser PMC",
        source:
          "pubmed.ncbi.nlm.nih.gov / pmc.ncbi.nlm.nih.gov / onlinelibrary.wiley.com",
        referenceIds: ["ning-fothergill-2016"],
      },
      {
        query:
          "Sacks 2009 Comparison Weight-Loss Diets Different Compositions Fat Protein Carbohydrates PMC",
        source:
          "pubmed.ncbi.nlm.nih.gov / pmc.ncbi.nlm.nih.gov / dash.harvard.edu",
        referenceIds: ["ning-sacks-2009"],
      },
      {
        query:
          '"Long-term persistence of hormonal adaptations to weight loss" Sumithran Prendergast 2011',
        source: "pubmed.ncbi.nlm.nih.gov / www.nejm.org",
        referenceIds: ["ning-sumithran-2011"],
      },
      {
        query: '"NEJM199508103330628" correction Leibel',
        source: "www.nejm.org",
        referenceIds: ["ning-leibel-1995"],
      },
      {
        query: '"Changes in Energy Expenditure" "1995;333:399" correction',
        source: "官方网站 / PubMed",
        referenceIds: ["ning-leibel-1995"],
      },
      {
        query: '"Comparison of Weight-Loss Diets" "Methods" "30 to 70" "811"',
        source: "官方网站 / PubMed",
        referenceIds: ["ning-sacks-2009"],
      },
      {
        query:
          "Villareal 2017 Aerobic Resistance Exercise Both Dieting Obese Older Adults PMC",
        source: "PubMed / NEJM 原刊 PDF",
        referenceIds: ["ning-villareal-2017"],
      },
      {
        query:
          "Longland 2016 Higher compared with lower dietary protein during energy deficit combined with intense exercise promotes greater lean mass gain fat mass loss PubMed",
        source: "PubMed / AJCN",
        referenceIds: ["ning-longland-2016"],
      },
      {
        query:
          "Nedeltcheva Insufficient sleep undermines dietary efforts to reduce adiposity 2010 20921542",
        source: "PubMed / PMC / Annals 原文摘要检索结果",
        referenceIds: ["ning-nedeltcheva-2010"],
      },
      {
        query:
          "Tasali 2022 Effect Sleep Extension Objectively Assessed Energy Intake Adults Overweight randomized clinical trial JAMA DOI PubMed",
        source: "JAMA Internal Medicine 原刊全文",
        referenceIds: ["ning-tasali-2022"],
      },
      {
        query: "site.nhc.gov.cn 肥胖症诊疗指南 2024 pdf 腰围 90 85",
        source: "www.nhc.gov.cn",
        referenceIds: ["ning-nhc-obesity-2024"],
      },
      {
        query: "site.nhc.gov.cn 体重管理指导原则 2024 pdf",
        source: "www.nhc.gov.cn",
        referenceIds: ["ning-nhc-weight-management-2024"],
      },
      {
        query: "site.nhc.gov.cn 肥胖症诊疗指南 2025年版 / 2026年版",
        source: "www.chinanutri.cn",
        referenceIds: [],
      },
      {
        query:
          "Peppard Young Palta Dempsey Skatrud 2000 longitudinal study moderate weight change sleep disordered breathing JAMA",
        source: "jamanetwork.com / pubmed.ncbi.nlm.nih.gov",
        referenceIds: ["ning-peppard-2000"],
      },
    ],
    limitations: [
      "这是针对固定脚本的定向文献核对，不是穷尽数据库的系统综述；检索词保留真实执行记录，没有编造筛选数量。",
      "能耗、营养、睡眠和运动研究的人群及干预条件不同，不能把单项试验推广为所有人的结论。",
      "Leibel 1995 存在原刊勘误，本次未采用涉勘误 Table 2 的数值；仅关联已核对摘要中的方向性结论。",
      "第13段“身体少抵抗、健康更稳定”未定义可测量结局，仍保留待核查；不为了给每段配文献而强行引用。",
    ],
  },
};
