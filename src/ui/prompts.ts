// SPDX-License-Identifier: AGPL-3.0-or-later
// AI 鑑定用プロンプトのパターン。文面を変えるときはここだけを編集する。

export type PromptId = "overall" | "each" | "soul" | "timeline" | "seven_years";

export interface PromptContext {
  /** 今年(西暦) */
  year: number;
  /** 現在の満年齢 */
  age: number;
}

const ROLE = "あなたは西洋占星術、インド占星術、数秘術、遺伝子易経に詳しい鑑定士です。";

const RULES = [
  "【鑑定内容】に書かれた値と解説をもとにし、星の配置や鍵の番号を推測したり計算し直したりしないでください。",
  "解説に書かれていないことを補うときは、一般的な解釈であると明記してください。",
  "読み解きごとに、どの体系のどの項目に基づくかを示してください。",
  "断定せず、傾向や読み方の一つとして伝えてください。",
  "計算されていない項目には触れないでください。",
];
const NOT_PROOF = "複数の体系に同じテーマが出ても、同じ出生情報から求めているので、証明としては扱わないでください。";

const ASK = `# 相談したいこと
(あれば、ここに書いてください。なければこのまま進めてください)`;

const list = (items: readonly string[], numbered = false) => items.map((x, i) => (numbered ? `${i + 1}. ${x}` : `- ${x}`)).join("\n");

interface Pattern {
  label: string;
  intro: (c: PromptContext) => string;
  steps: readonly string[] | ((c: PromptContext) => readonly string[]);
  extraRules?: readonly string[];
  replaceRules?: readonly string[];
  ask?: boolean;
}

export const PROMPT_PATTERNS: Readonly<Record<PromptId, Pattern>> = {
  overall: {
    label: "総合的な鑑定",
    intro: () => `${ROLE}以下の【鑑定内容】をもとに、複数の体系を踏まえて総合的に鑑定してください。`,
    steps: [
      "体系ごとの要点を簡潔にまとめてください。",
      "体系をまたいで、共通するテーマと、食い違う点を示してください。",
      "才能、課題、人生のテーマを総合してまとめてください。",
      "日常で試せる具体的な提案を3つ挙げてください。",
      "自分で考えを深めるための問いを3つ挙げてください。",
    ],
    extraRules: [NOT_PROOF],
    ask: true,
  },
  each: {
    label: "占術ごとの鑑定",
    intro: () => `${ROLE}以下の【鑑定内容】をもとに、占術ごとに分けて鑑定してください。`,
    steps: [
      "占術ごとに見出しを分け、それぞれの才能、課題、人生のテーマを読み解いてください。",
      "主要な項目がどのような意味を持つかを、値を示しながら説明してください。",
      "占術ごとに、日常で試せる提案を1つずつ挙げてください。",
    ],
    extraRules: ["別の占術の内容を混ぜず、その占術の考え方の中で読み解いてください。"],
    ask: true,
  },
  soul: {
    label: "魂の目的とカルマ的な課題",
    intro: () => `${ROLE}以下の【鑑定内容】をもとに、私の魂の目的とカルマ的な課題を読み解いてください。`,
    steps: [
      "遺伝子易経のライフワーク、進化、輝き、目的、コアから、魂の目的として読めることを示してください。",
      "インド占星術のラーフとケートゥ、第9室と第12室、土星から、向かう方向と手放すテーマを読み解いてください。",
      "西洋占星術の土星と冥王星、第12ハウスなどから、繰り返し向き合うテーマを読み解いてください。",
      "数秘術のライフパスから、人生を通じたテーマを示してください。",
      "以上を踏まえ、魂の目的とカルマ的な課題を整理し、日常で向き合う方法を3つ挙げてください。",
      "自分で考えを深めるための問いを3つ挙げてください。",
    ],
    extraRules: [
      NOT_PROOF,
      "魂、カルマ、前世は象徴的な読み方として扱い、事実として断定しないでください。",
      "課題を罰や欠点としてではなく、成長のテーマとして伝えてください。",
    ],
    ask: true,
  },
  timeline: {
    label: "人生の変曲点と1年ごとの運勢",
    intro: ({ year, age }) => `${ROLE}以下の【鑑定内容】をもとに、私の人生の変曲点と1年ごとの運勢を読み解いてください。今年は${year}年で、私は満${age}歳です。`,
    steps: ({ year }) => [
      "土星回帰(約29歳、約58歳)、木星回帰(約12年ごと)、天王星の半回帰(約42歳)など、一般的な周期の年齢をもとに、私の人生の変曲点の候補を挙げてください。",
      "インド占星術のマハーダシャーを、月のナクシャトラと位置をもとに計算過程を示して求め、時期の区切りを示してください。",
      `${year}年から${year + 4}年までの5年について、数秘術の個人年数(誕生月と誕生日に西暦を加えて計算)を計算過程とともに求め、1年ごとのテーマを示してください。`,
      "過去の変曲点の候補には、当時の出来事を振り返るための問いを添えてください。",
      "これから5年の過ごし方について、具体的な提案を挙げてください。",
    ],
    replaceRules: [
      "【鑑定内容】に書かれた値と解説をもとにしてください。出生時の星の配置や鍵の番号を計算し直さないでください。",
      "【鑑定内容】には各年の天体の位置が含まれていません。年齢の周期は一般的な目安として伝え、特定の年の天体の位置を断定しないでください。",
      "自分で計算した部分は計算過程を示し、AIの計算であるため誤りがありうることを明記してください。",
      "解説に書かれていないことを補うときは、一般的な解釈であると明記してください。",
      "読み解きごとに、どの体系のどの項目に基づくかを示してください。",
      "未来の出来事を予言せず、テーマや傾向として伝えてください。",
      "計算されていない項目には触れないでください。",
    ],
    ask: true,
  },
  seven_years: {
    label: "7年周期の振り返り",
    intro: ({ age }) => `${ROLE}以下の【鑑定内容】をもとに、7年周期で私の人生を振り返るための質問をしてください。私は現在、満${age}歳です。あなたが答えを出すのではなく、質問を通じて私自身の振り返りを助けてください。`,
    steps: ({ age }) => {
      const last = Math.floor(age / 7) * 7;
      return [
        `0〜7歳から、7年ごとに現在の${last}〜${last + 7}歳の周期まで順番に振り返ります。`,
        "一度に1つだけ質問し、私の答えを待ってから、その答えに触れて次の質問をしてください。",
        "質問は1つの周期につき2〜3問にしてください。",
        "遺伝子易経の魂の知能指数(SQ、0〜7歳)、心の知能指数(EQ、7〜14歳)、知能指数(IQ、14〜21歳)など、関連する項目があれば質問に生かし、どの項目に基づくかを添えてください。",
        "1つの周期が終わるごとに、私の答えから見えたことを短くまとめてください。",
        "すべて終わったら、周期を通じて繰り返しているテーマと、これからの7年に向けた問いをまとめてください。",
        "最初は、準備ができているかを尋ね、最初の質問を1つだけしてください。",
      ];
    },
    extraRules: [
      "つらい記憶に触れるときは無理に答えを求めず、飛ばしてよいと伝えてください。",
      "深い苦痛が語られたときは、心理の専門家や信頼できる人への相談を勧めてください。",
      "私の過去や性格を決めつけないでください。",
    ],
    ask: false,
  },
};

/** 概要に並べる順 */
export const PROMPT_ORDER: readonly PromptId[] = ["overall", "each", "soul", "timeline", "seven_years"];

export function promptHead(id: PromptId, context: PromptContext): string {
  const p = PROMPT_PATTERNS[id];
  const steps = typeof p.steps === "function" ? p.steps(context) : p.steps;
  const rules = p.replaceRules ?? [...RULES, ...(p.extraRules ?? [])];
  return [p.intro(context), `# 進め方\n${list(steps, true)}`, `# 守ること\n${list(rules)}`, ...(p.ask ? [ASK] : [])].join("\n\n");
}

export const buildPrompt = (id: PromptId, body: string, context: PromptContext): string => `${promptHead(id, context)}\n\n# 鑑定内容\n${body}`;

/** 誕生日を過ぎているかを含めた満年齢 */
export function ageOn(birthIso: string, todayIso: string): number {
  const [y, m, d] = birthIso.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = todayIso.split("-").map(Number) as [number, number, number];
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}
