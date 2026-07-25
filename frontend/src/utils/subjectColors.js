const SUBJECT_PALETTE = [
  { bg: 'bg-[#E8F0FE]', text: 'text-[#1A4B8C]', border: 'border-[#1A4B8C]', dot: 'bg-[#1A4B8C]' },
  { bg: 'bg-[#E6F4EA]', text: 'text-[#1E6B3A]', border: 'border-[#1E6B3A]', dot: 'bg-[#1E6B3A]' },
  { bg: 'bg-[#FEF3E6]', text: 'text-[#9A4E0A]', border: 'border-[#9A4E0A]', dot: 'bg-[#9A4E0A]' },
  { bg: 'bg-[#F3E8FD]', text: 'text-[#5B2D8E]', border: 'border-[#5B2D8E]', dot: 'bg-[#5B2D8E]' },
  { bg: 'bg-[#FDE8E8]', text: 'text-[#8B1A1A]', border: 'border-[#8B1A1A]', dot: 'bg-[#8B1A1A]' },
  { bg: 'bg-[#E8F8F8]', text: 'text-[#0D5C5C]', border: 'border-[#0D5C5C]', dot: 'bg-[#0D5C5C]' },
  { bg: 'bg-[#FFF8E6]', text: 'text-[#7A5C00]', border: 'border-[#7A5C00]', dot: 'bg-[#7A5C00]' },
  { bg: 'bg-[#ECEAE7]', text: 'text-[#102326]', border: 'border-[#102326]', dot: 'bg-[#102326]' },
];

export function getSubjectStyle(subjectName = '') {
  const hash = subjectName
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length];
}
