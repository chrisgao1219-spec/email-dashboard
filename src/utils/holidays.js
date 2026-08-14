const HOLIDAYS = [
  { name: '618 年中大促', month: 6, day: 18, emoji: '🎉', region: '中国', rampWeeks: 2, desc: '京东/天猫年中大促' },
  { name: 'Prime Day', month: 7, day: 15, emoji: '📦', region: '全球', rampWeeks: 3, desc: '亚马逊会员日' },
  { name: '返校季', month: 8, day: 15, emoji: '🎒', region: '北美', rampWeeks: 3, desc: 'Back to School' },
  { name: '双11', month: 11, day: 11, emoji: '🛒', region: '中国', rampWeeks: 4, desc: '全球最大购物节' },
  { name: 'Black Friday', month: 11, day: 28, emoji: '⚫', region: '全球', rampWeeks: 4, desc: '黑色星期五' },
  { name: 'Cyber Monday', month: 11, day: 30, emoji: '💻', region: '全球', rampWeeks: 4, desc: '网络星期一' },
  { name: '双12', month: 12, day: 12, emoji: '🏷️', region: '中国', rampWeeks: 1, desc: '双12年终盛典' },
  { name: 'Christmas', month: 12, day: 25, emoji: '🎄', region: '全球', rampWeeks: 3, desc: '圣诞购物季' },
  { name: '新年', month: 1, day: 1, emoji: '🎆', region: '全球', rampWeeks: 1, desc: '新年促销' },
  { name: '情人节', month: 2, day: 14, emoji: '💝', region: '全球', rampWeeks: 2, desc: "Valentine's Day" },
  { name: '母亲节', month: 5, day: 12, emoji: '🌸', region: '北美/欧洲', rampWeeks: 2, desc: "Mother's Day" },
  { name: '父亲节', month: 6, day: 15, emoji: '👔', region: '北美/欧洲', rampWeeks: 2, desc: "Father's Day" },
];

function getDaysUntil(holiday, now) {
  const year = now.getFullYear();
  const hDate = new Date(year, holiday.month - 1, holiday.day);
  if (hDate < now) hDate.setFullYear(year + 1);
  return Math.ceil((hDate - now) / (1000 * 60 * 60 * 24));
}

function holidayUrgency(days) {
  if (days <= 14) return 'now';
  if (days <= 30) return 'soon';
  if (days <= 60) return 'ahead';
  return 'later';
}

export { HOLIDAYS, getDaysUntil, holidayUrgency };
