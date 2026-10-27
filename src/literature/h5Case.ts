import type { LiteratureCase } from "./types";

// Regions use percentages of the original image, not of its viewport crop.
// `verified` describes the reference check stated in verificationNote; it does
// not mean every claim on the source artwork has passed an evidence review.
export const h5Case: LiteratureCase = {
  id: "h5-weight-management",
  kind: "h5",
  title: "科学体重管理 H5 · 逐区域文献溯源",
  subtitle: "3 张原图 · 8 个内容区域 · 10 条原始引用",
  source: "用户提供的核心 POC 文档 · H5 内容示例",
  sourceNote:
    "原图按文档内 image6、image7、image8 的顺序保留为 H5 图 1、2、3，并非视频参考图 image1–3。三张 H5 共用图 1 底部的参考文献 1–10；编号不重新编排。文字与区域为人工核读的预置演示，未实时 OCR 或联网检索。字母 a、*、# 是解释性脚注，不是新增文献。原图含 CMAT-49002、仅面向中国大陆成人读者的说明，以及礼来、Keep、新华网标识。书目核验与主张支持程度分别展示，未核验的条目不视为已通过证据检查。",
  version: "H5-2026-10-27",
  images: [
    {
      id: "h5-image-1",
      src: "/literature/h5-1.jpeg",
      label: "H5 图 1 · 医学教练、活动与参考文献",
    },
    {
      id: "h5-image-2",
      src: "/literature/h5-2.jpeg",
      label: "H5 图 2 · 体重管理三大策略",
    },
    {
      id: "h5-image-3",
      src: "/literature/h5-3.jpeg",
      label: "H5 图 3 · BMI 基础知识",
    },
  ],
  segments: [
    {
      id: "h5-medical-assessment",
      sourceNumber: "01",
      title: "医学诊断与个体评估",
      imageId: "h5-image-1",
      region: { x: 5, y: 11.1, width: 90, height: 5.6 },
      original:
        "成人肥胖症具备明确的医学诊断标准。建议前往医院内分泌科或减重门诊，由专业医生结合患者个体情况进行科学的诊断、评估与管理。[1,10]",
      revised:
        "成人肥胖症的判断与管理应结合个体情况。原图的就诊提示及科室推荐保留为待复核文案；需补齐文献[10]全文并确认其对应章节后，再确认完整引用。[1,10]",
      reason:
        "[1]可支持成人体重分类的依据；目前尚未核对[10]全文，不能把就诊科室、诊断与管理三项表达全部判为已获支持。",
      status: "partial",
      claims: [
        "成人肥胖症有医学判断标准",
        "就诊科室与个体化评估建议需分别核对",
      ],
      keywords: ["成人肥胖", "个体评估", "内分泌科", "减重门诊"],
      evidence: [
        {
          referenceId: "h5-ref-1",
          locator:
            "官方附件 · 附表 1：中国成人（18 岁及以上）体重判定标准，第 16 页",
          support: "官方附件列明成人体重分类，为本段的分类依据提供支持。",
          boundary:
            "本次核对范围不覆盖原图中的具体科室推荐，也不替代临床诊断。",
        },
        {
          referenceId: "h5-ref-10",
          locator: "原图 1 底部参考文献第 10 项；正文定位待补充",
          support: "已保留原图引用对应关系；尚不能确认正文支持范围。",
          boundary: "题名与正文未核验，暂不标为直接支持。",
        },
      ],
    },
    {
      id: "h5-event-invitation",
      sourceNumber: "02",
      title: "运动活动与参与信息",
      imageId: "h5-image-1",
      region: { x: 3, y: 28.7, width: 94, height: 13.6 },
      original:
        "双城运动街区，轻松开玩。打卡双城运动街区快闪活动，参与乒乓球、羽毛球、篮球、足球等趣味运动挑战，在畅快运动中轻松解锁科学减重知识，开启轻松上场新体验。",
      revised:
        "保留活动参与说明；场地、日期及报名方式与项目方活动资料核对。活动邀请本身无需匹配医学研究，也不应改写为参与活动即可获得具体减重效果。",
      reason: "区分活动事实与医学结论，避免给所有营销文字机械添加文献。",
      status: "not-needed",
      claims: ["本段为活动参与说明", "活动信息须由项目资料核对"],
      keywords: ["双城活动", "参与说明", "活动资料"],
      evidence: [],
    },
    {
      id: "h5-weight-loss-threshold",
      sourceNumber: "03",
      title: "减重幅度与健康指标",
      imageId: "h5-image-2",
      region: { x: 28, y: 18.3, width: 68, height: 13.7 },
      original:
        "不是瘦一点就够了ᵃ。当体重下降到一定幅度，健康状态可能改善[3]。减重≥20%可能与代谢综合征风险改善相关[4]。\nᵃ 成人超重/肥胖的减重目标需要遵循个体化原则，由医患共同讨论决策，在医生的指导下制定和达到合理的预期目标。",
      revised:
        "减重幅度与健康指标的关系需结合研究人群和结局理解。[4]研究包含长期减重≥20%的分组；这不能直接作为每个人的减重目标。保留“可能”“相关”及原图个体化目标脚注，待核对全文效应值与比较组后确认表述。[3,4]",
      reason:
        "已找到对应书目及研究设计，但尚未完成所有结果与比较组的逐项核对；去掉“不是瘦一点就够了”的绝对暗示，保留原图的个体化限定。",
      status: "partial",
      claims: [
        "健康变化不能只看减重百分比",
        "≥20%为特定研究分组，不能成为普遍目标",
      ],
      keywords: ["减重幅度", "≥20%", "代谢综合征", "个体化", "NHANES"],
      evidence: [
        {
          referenceId: "h5-ref-3",
          locator: "PubMed 28455679 · 题名、书目与摘要 Purpose of review",
          support: "综述讨论不同减重幅度与合并疾病改善的关系，可作为主题依据。",
          boundary:
            "综述不是针对本图所有人群的统一阈值建议；各健康结局需分别核对。",
        },
        {
          referenceId: "h5-ref-4",
          locator: "PubMed 30119916；PMC6526934 索引中的研究目的与纳入人群",
          support:
            "研究分析 2007–2014 年 NHANES 中 7,670 名符合条件的美国成年人，包含≥20%的长期减重分组。",
          boundary:
            "本次仅核对书目及研究设计；效应值与比较组待全文复核，不据此作因果或个体疗效承诺。",
        },
      ],
    },
    {
      id: "h5-abdominal-prevalence",
      sourceNumber: "04",
      title: "87.8%：补齐分母与调查范围",
      imageId: "h5-image-2",
      region: { x: 13, y: 54.3, width: 53, height: 4.2 },
      original: "我国成人肥胖患者中，87.8%符合腹型肥胖标准（“大肚子”）。[6]",
      revised:
        "在 2012–2015 年中国成人横断面调查中，BMI≥28 kg/m²组的腹型肥胖比例为87.8%（95% CI：86.5%–88.9%）。该研究以男性腰围≥90 cm、女性≥85 cm界定腹型肥胖。[6]",
      reason:
        "原研究表 2 可定位该数字。补充调查年代、BMI 分组及腰围定义，避免把它当作所有中国成年人或当前年度的比例。",
      status: "supported",
      claims: ["87.8%对应研究中BMI≥28的分组", "腹型肥胖依据研究定义的腰围标准"],
      keywords: ["87.8%", "BMI≥28", "腰围", "横断面调查", "2012–2015"],
      evidence: [
        {
          referenceId: "h5-ref-6",
          locator: "Wiley 全文 · Methods / Definitions；Table 2 的 BMI≥28.0 行",
          support:
            "表 2 列出该组87.8%及95%置信区间；方法部分给出调查年代、人群和腰围定义。",
          boundary:
            "支持所述研究条件下的比例，不能外推为全国所有人群的当年实时数据，也不能推断因果。",
        },
      ],
    },
    {
      id: "h5-visceral-risk",
      sourceNumber: "05",
      title: "腹型肥胖与风险关联",
      imageId: "h5-image-2",
      region: { x: 13, y: 58.5, width: 53, height: 5.8 },
      original:
        "肚腩大往往意味着内脏脂肪较多[7]，与代谢异常、心血管疾病等风险密切相关，危害全身健康[8]。",
      revised:
        "本段暂不形成可发布改写。需核对[7]如何测量内脏脂肪，以及[8]的研究人群、结局和关联强度；不能仅凭外观推断个人内脏脂肪或疾病风险。[7,8]",
      reason:
        "原图给出了引用编号，但两条来源尚未完成题名与正文核验；把外观、脂肪量和疾病风险分别列为待核查主张。",
      status: "pending",
      claims: [
        "外观与内脏脂肪测量的对应关系待核对",
        "代谢及心血管风险关联的依据待核对",
      ],
      keywords: ["内脏脂肪", "腹型肥胖", "风险关联", "测量方法"],
      evidence: [
        {
          referenceId: "h5-ref-7",
          locator: "原图上标 7 → 图 1 参考文献 7；正文定位未完成",
          support: "保留原图的来源线索，尚未确认其具体证据。",
          boundary: "题名和正文待核验，不将“大肚子”等同于个体内脏脂肪诊断。",
        },
        {
          referenceId: "h5-ref-8",
          locator: "原图上标 8 → 图 1 参考文献 8；正文定位未完成",
          support: "保留原图的风险关联引用，尚未确认人群和结局。",
          boundary: "未核对效应量和研究设计，不能强化为因果结论。",
        },
      ],
    },
    {
      id: "h5-muscle-retention",
      sourceNumber: "06",
      title: "“守肌”与减重质量",
      imageId: "h5-image-2",
      region: { x: 27, y: 85, width: 66, height: 8.5 },
      original: "不能只盯着体重数字。减重亦要“守”肌，提升减重质量。[9]",
      revised:
        "保留“关注体重之外的身体组成”作为待审表达；补齐[9]题名、完整卷页或 DOI，并核对研究中的肌肉相关指标后，再确认“守肌”与“减重质量”的关联。",
      reason:
        "原图仅给出 Khan MS 等、Eur Heart J、2026;00:1–22，信息不足以唯一定位。不得补造标题或认为已有上标就代表证据通过。",
      status: "pending",
      claims: [
        "肌肉相关结局与测量指标待核验",
        "“减重质量”需要明确可核对的定义",
      ],
      keywords: ["肌肉", "身体组成", "减重质量", "书目信息待补"],
      evidence: [
        {
          referenceId: "h5-ref-9",
          locator: "原图上标 9 → 图 1 参考文献 9；无法唯一定位",
          support: "目前仅有原图的简写书目，未形成已验证证据。",
          boundary: "不将瘦体重、肌肉质量和肌肉功能自动视为同一结局。",
        },
      ],
    },
    {
      id: "h5-bmi-classification",
      sourceNumber: "07",
      title: "BMI 公式与成人分类",
      imageId: "h5-image-3",
      region: { x: 8, y: 48.5, width: 84, height: 40.5 },
      original:
        "BMI是评估全身性肥胖的通用标准[2]。BMI（体重指数）=体重（kg）/身高（m）²。体重过轻：BMI<18.5；正常：18.5≤BMI<24；超重：24≤BMI<28；肥胖：BMI≥28。#单位：kg/m²。图标题引用[1,2]。",
      revised:
        "按原图展示 BMI 计算方式，并明确本表用于中国18岁及以上成人的体重分类。分类阈值可与[1]附表1对照；“通用标准”表述及原引用[2]仍待核对。保留单位kg/m²，具体个体评估还需考虑适用条件。[1,2]",
      reason:
        "[1]官方附件的成人分类表可核对数值；[2]尚未完成书目和正文核验，因此整段标为部分支持，不让分类表替代完整医学评估。",
      status: "partial",
      claims: [
        "BMI公式及单位必须清楚呈现",
        "分类范围明确为中国18岁及以上成人",
        "[2]的原引用关系待核对",
      ],
      keywords: ["BMI", "18.5", "24", "28", "kg/m²", "中国成人"],
      evidence: [
        {
          referenceId: "h5-ref-1",
          locator:
            "官方附件 · 附表1，第16页，题为“中国成人（18岁及以上）体重判定标准”",
          support:
            "表中列出<18.5、18.5–23.9、24.0–27.9、≥28.0四类数值，与图示分类对应。",
          boundary:
            "支持成人分类数值；不覆盖所有特殊人群，也不自动证明引用[2]的整句措辞。",
        },
        {
          referenceId: "h5-ref-2",
          locator: "原图上标2 → 图1参考文献2；完整书目和正文待核对",
          support: "原图引用关系已保留，尚未核实本条具体来源内容。",
          boundary:
            "作者姓名未完全辨清且原图没有题名，暂不填写猜测的标题或DOI。",
        },
      ],
    },
    {
      id: "h5-obesity-grading",
      sourceNumber: "08",
      title: "肥胖进一步分级脚注",
      imageId: "h5-image-3",
      region: { x: 10, y: 91, width: 82, height: 6 },
      original:
        "*肥胖还可以进一步细分为：轻度肥胖（28.0kg/m²≤BMI<32.5kg/m²），中度肥胖（32.5kg/m²≤BMI<37.5kg/m²），重度肥胖（37.5kg/m²≤BMI<50kg/m²），极重度肥胖（≥50kg/m²）。[5]",
      revised:
        "先保留原图分级与单位，不作自动改写。需核对[5]原文中的分级名称、边界和适用范围，再决定是否用于本次成稿；*是解释性脚注，[5]才是文献编号。",
      reason:
        "该分级引用的是[5]，不能仅因与BMI分类相邻，就把已核对的[1]视为这段脚注已通过。",
      status: "pending",
      claims: ["四级分界值需与[5]逐项核对", "解释脚注与引用编号需区分"],
      keywords: ["肥胖分级", "32.5", "37.5", "50", "解释性脚注"],
      evidence: [
        {
          referenceId: "h5-ref-5",
          locator: "原图脚注末尾上标5 → 图1参考文献5；正文定位待补充",
          support: "已保留原图作者机构、期刊与页码；尚未确认具体分级段落。",
          boundary: "未核验全文前，不将原图数值标为已通过医学证据审核。",
        },
      ],
    },
  ],
  references: [
    {
      id: "h5-ref-1",
      label: "1",
      title: "体重管理指导原则（2024年版）",
      authors: "国家卫生健康委员会",
      publication: "国家卫生健康委办公厅；2024年版",
      year: 2024,
      url: "https://www.nhc.gov.cn/wjw/ylyjs/202412/b3d40e0141834897808ce6c9dce76a60/files/1736390749000_59785.pdf",
      verified: true,
      verificationNote:
        "2026-10-27核对官方发布通知及官方PDF索引中可见的附表1；PDF正文直连读取超时，未声称逐条完成全文核验。",
      scope:
        "已核对中国18岁及以上成人分类表。仅供对应条目的限定支持，不能覆盖原图所有就诊或管理建议。",
    },
    {
      id: "h5-ref-2",
      label: "2",
      title: "原图未列题名 · 待补齐完整书目",
      authors: "原图中文作者姓名待进一步核读",
      publication: "中国循环杂志. 2025;40(1):6–30.",
      year: 2025,
      verified: false,
      verificationNote:
        "原图转录待核验；期刊、年份和卷页可辨，作者姓名未充分确认，未补造题名、DOI或链接。",
      scope: "图3用于BMI相关表述，具体支持范围须以原文为准。",
    },
    {
      id: "h5-ref-3",
      label: "3",
      title:
        "Weight Loss and Improvement in Comorbidity: Differences at 5%, 10%, 15%, and Over",
      authors: "Ryan DH, Yockey SR",
      publication: "Curr Obes Rep. 2017;6(2):187–194.",
      year: 2017,
      doi: "10.1007/s13679-017-0262-y",
      pmid: "28455679",
      url: "https://pubmed.ncbi.nlm.nih.gov/28455679/",
      verified: true,
      verificationNote:
        "2026-10-27核对PubMed题名、作者、卷页、DOI及综述摘要；尚未逐项核对全文中的全部疾病结局。",
      scope: "不同减重幅度与合并疾病改善的综述，不是所有人统一减重目标的依据。",
    },
    {
      id: "h5-ref-4",
      label: "4",
      title:
        "Long-Term Weight Loss and Metabolic Health in Adults Concerned With Maintaining or Losing Weight: Findings From NHANES",
      authors: "Knell G, Li Q, Pettee Gabriel K, Shuval K",
      publication: "Mayo Clin Proc. 2018;93(11):1611–1616.",
      year: 2018,
      doi: "10.1016/j.mayocp.2018.04.018",
      pmid: "30119916",
      url: "https://pubmed.ncbi.nlm.nih.gov/30119916/",
      verified: true,
      verificationNote:
        "2026-10-27核对PubMed书目、DOI及PMC索引中的NHANES研究设计；未完成所有效应值与比较组的全文复核。",
      scope:
        "符合研究条件的美国成人长期减重分组与代谢健康的关联分析；不能据此设定统一≥20%目标。",
    },
    {
      id: "h5-ref-5",
      label: "5",
      title: "原图未列题名 · 肥胖分级来源待核验",
      authors: "中华人民共和国国家卫生健康委员会医政司",
      publication: "协和医学杂志. 2025;16(1):90–108.",
      year: 2025,
      verified: false,
      verificationNote:
        "原图转录待核验；未完成题名、原文及脚注分级段落的核对。",
      scope: "原图3分级脚注引用；仅保留来源线索，不作为已核验分级证据。",
    },
    {
      id: "h5-ref-6",
      label: "6",
      title:
        "Prevalence of Abdominal Obesity in China: Results from a Cross-Sectional Study of Nearly Half a Million Participants",
      authors: "Zhang L, Wang Z, Wang X, et al.",
      publication: "Obesity (Silver Spring). 2019;27(11):1898–1905.",
      year: 2019,
      doi: "10.1002/oby.22620",
      pmid: "31549787",
      url: "https://onlinelibrary.wiley.com/doi/full/10.1002/oby.22620",
      verified: true,
      verificationNote:
        "2026-10-27核对PubMed书目及Wiley全文的Methods、Definitions与Table 2，定位87.8%所在分组。",
      scope:
        "2012–2015年中国成人调查，BMI≥28组的腹型肥胖比例；对应限定的数字可核对，不代表当前所有人群。",
    },
    {
      id: "h5-ref-7",
      label: "7",
      title: "原图未列题名 · 内脏脂肪相关来源待核验",
      authors: "李红，等（原图转录）",
      publication: "中华全科医师杂志. 2020;19(2):95–101.",
      year: 2020,
      verified: false,
      verificationNote:
        "原图转录待核验；尚未确认题名、测量方法及具体支持段落。",
      scope: "原图2的内脏脂肪表述；不能仅依上标确认其证据充分性。",
    },
    {
      id: "h5-ref-8",
      label: "8",
      title: "原图未列题名 · 风险关联来源待核验",
      authors: "郑邦伟（原图转录）",
      publication: "中西医结合心血管病电子杂志. 2018;6(11):195–196.",
      year: 2018,
      verified: false,
      verificationNote:
        "原图转录待核验；尚未确认题名、研究设计、适用人群或风险结局。",
      scope: "原图2的代谢与心血管风险表述；未验证关联强度或因果关系。",
    },
    {
      id: "h5-ref-9",
      label: "9",
      title: "原图未列题名 · 保肌相关来源待定位",
      authors: "Khan MS, et al.（原图转录）",
      publication: "Eur Heart J. 2026;00:1–22.（原图写法）",
      year: 2026,
      verified: false,
      verificationNote:
        "原图转录待核验；卷号00与缺失题名不足以唯一定位，未猜测DOI或链接。",
      scope: "原图2的“守肌”表述；需明确来源和肌肉相关结局后再评估支持程度。",
    },
    {
      id: "h5-ref-10",
      label: "10",
      title: "原图未列题名 · 诊断与管理来源待核验",
      authors: "中华人民共和国国家卫生健康委员会医政司",
      publication: "中华消化外科杂志. 2024;23(10):1237–1260.",
      year: 2024,
      verified: false,
      verificationNote:
        "原图转录待核验；未确认题名及就诊、诊断和管理对应章节。",
      scope: "原图1的就医建议与个体管理表述；不据现有卷页推断整段已受支持。",
    },
  ],
};
