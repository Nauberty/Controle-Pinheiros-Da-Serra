// Ficha completa do membro, com campos equivalentes aos do SGC.
// Esta lista alimenta o formulário, a importação/exportação de planilhas e o registro de alterações.

export type Section = 'pessoal' | 'contato' | 'responsaveis' | 'igreja' | 'saude' | 'clube';

export const SECTIONS: { id: Section; label: string }[] = [
  { id: 'pessoal', label: 'Dados pessoais' },
  { id: 'contato', label: 'Contato e endereço' },
  { id: 'responsaveis', label: 'Responsáveis' },
  { id: 'igreja', label: 'Igreja' },
  { id: 'saude', label: 'Saúde' },
  { id: 'clube', label: 'Clube e classes' },
];

export const ROLES = [
  'Desbravador',
  'Conselheiro(a)',
  'Conselheiro(a) associado(a)',
  'Instrutor(a)',
  'Secretário(a)',
  'Tesoureiro(a)',
  'Capelão / Capelã',
  'Diretor(a) associado(a)',
  'Diretor(a)',
  'Apoio',
];

const LEGACY_ROLES: Record<string, string> = {
  desbravador: 'Desbravador',
  conselheiro: 'Conselheiro(a)',
  diretoria: 'Diretor(a) associado(a)',
  outro: 'Apoio',
};
export const roleLabel = (r?: string) => (r ? LEGACY_ROLES[r] ?? r : '—');

export const CLASSES = [
  'Amigo',
  'Companheiro',
  'Pesquisador',
  'Pioneiro',
  'Excursionista',
  'Guia',
  'Líder',
  'Líder Master',
  'Líder Master Avançado',
];

export const PROFILE_KEYS = [
  'birthDate', 'gender', 'cpf', 'rg', 'shirtSize',
  'phone', 'email', 'street', 'number', 'district', 'city', 'state', 'zip',
  'fatherName', 'fatherPhone', 'motherName', 'motherPhone', 'guardian', 'guardianPhone', 'guardianRelation',
  'baptized', 'baptismDate', 'church',
  'bloodType', 'allergies', 'medications', 'healthConditions', 'healthPlan', 'susCard', 'emergencyContact',
  'joinDate', 'currentClass', 'completedClasses', 'specialties', 'investitures', 'insurance', 'sgcId', 'notes',
] as const;

export type ProfileKey = (typeof PROFILE_KEYS)[number];

export interface FieldDef {
  key: ProfileKey;
  label: string;
  section: Section;
  type?: 'text' | 'date' | 'select' | 'textarea' | 'tel' | 'email';
  options?: string[];
  full?: boolean;
  placeholder?: string;
  aliases?: string[]; // nomes alternativos de coluna para importar planilhas
}

export const FIELDS: FieldDef[] = [
  { key: 'birthDate', label: 'Data de nascimento', section: 'pessoal', type: 'date', aliases: ['nascimento', 'data nascimento', 'dt nascimento'] },
  { key: 'gender', label: 'Sexo', section: 'pessoal', type: 'select', options: ['Masculino', 'Feminino'] },
  { key: 'cpf', label: 'CPF', section: 'pessoal' },
  { key: 'rg', label: 'RG', section: 'pessoal', aliases: ['identidade'] },
  { key: 'shirtSize', label: 'Tamanho de camiseta/uniforme', section: 'pessoal', type: 'select', options: ['PP', 'P', 'M', 'G', 'GG', 'XG', '8', '10', '12', '14', '16'], aliases: ['tamanho', 'camiseta'] },

  { key: 'phone', label: 'Celular', section: 'contato', type: 'tel', aliases: ['telefone', 'whatsapp', 'fone'] },
  { key: 'email', label: 'E-mail', section: 'contato', type: 'email' },
  { key: 'street', label: 'Endereço (rua)', section: 'contato', full: true, aliases: ['endereco', 'rua', 'logradouro'] },
  { key: 'number', label: 'Número', section: 'contato', aliases: ['numero', 'nº'] },
  { key: 'district', label: 'Bairro', section: 'contato' },
  { key: 'city', label: 'Cidade', section: 'contato', aliases: ['municipio'] },
  { key: 'state', label: 'UF', section: 'contato', aliases: ['estado'] },
  { key: 'zip', label: 'CEP', section: 'contato' },

  { key: 'fatherName', label: 'Nome do pai', section: 'responsaveis', aliases: ['pai'] },
  { key: 'fatherPhone', label: 'Telefone do pai', section: 'responsaveis' },
  { key: 'motherName', label: 'Nome da mãe', section: 'responsaveis', aliases: ['mae'] },
  { key: 'motherPhone', label: 'Telefone da mãe', section: 'responsaveis' },
  { key: 'guardian', label: 'Responsável legal', section: 'responsaveis', aliases: ['responsavel', 'nome do responsavel'] },
  { key: 'guardianPhone', label: 'Telefone do responsável', section: 'responsaveis', aliases: ['telefone responsavel'] },
  { key: 'guardianRelation', label: 'Parentesco do responsável', section: 'responsaveis', aliases: ['parentesco'] },

  { key: 'baptized', label: 'Batizado(a)', section: 'igreja', type: 'select', options: ['Sim', 'Não'], aliases: ['batizado'] },
  { key: 'baptismDate', label: 'Data do batismo', section: 'igreja', type: 'date' },
  { key: 'church', label: 'Igreja', section: 'igreja', aliases: ['igreja local'] },

  { key: 'bloodType', label: 'Tipo sanguíneo', section: 'saude', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], aliases: ['tipo sanguineo', 'sangue'] },
  { key: 'healthPlan', label: 'Plano de saúde', section: 'saude', aliases: ['convenio'] },
  { key: 'susCard', label: 'Cartão SUS', section: 'saude', aliases: ['sus', 'cartao sus'] },
  { key: 'emergencyContact', label: 'Contato de emergência', section: 'saude', aliases: ['emergencia'] },
  { key: 'allergies', label: 'Alergias', section: 'saude', type: 'textarea', full: true, aliases: ['alergia'] },
  { key: 'medications', label: 'Medicamentos de uso contínuo', section: 'saude', type: 'textarea', full: true, aliases: ['medicamentos', 'remedios'] },
  { key: 'healthConditions', label: 'Condições de saúde / restrições', section: 'saude', type: 'textarea', full: true, aliases: ['doencas', 'condicoes', 'restricoes'] },

  { key: 'joinDate', label: 'Data de ingresso no clube', section: 'clube', type: 'date', aliases: ['ingresso', 'data de ingresso'] },
  { key: 'currentClass', label: 'Classe atual', section: 'clube', type: 'select', options: CLASSES, aliases: ['classe'] },
  { key: 'insurance', label: 'Seguro anual', section: 'clube', type: 'select', options: ['Pago', 'Pendente'], aliases: ['seguro'] },
  { key: 'sgcId', label: 'Código no SGC', section: 'clube', aliases: ['codigo', 'código sgc', 'id sgc', 'matricula'] },
  { key: 'completedClasses', label: 'Classes concluídas', section: 'clube', type: 'textarea', full: true, placeholder: 'Uma por linha', aliases: ['classes concluidas'] },
  { key: 'specialties', label: 'Especialidades', section: 'clube', type: 'textarea', full: true, placeholder: 'Uma por linha', aliases: ['especialidade'] },
  { key: 'investitures', label: 'Investiduras', section: 'clube', type: 'textarea', full: true, placeholder: 'Ex.: 2025 – Amigo', aliases: ['investidura'] },
  { key: 'notes', label: 'Observações', section: 'clube', type: 'textarea', full: true, aliases: ['obs', 'observacao'] },
];

export const fieldLabel = (key: string) =>
  ({ name: 'Nome', unitId: 'Unidade', role: 'Função', active: 'Situação' })[key] ?? FIELDS.find((f) => f.key === key)?.label ?? key;

export function age(birthDate?: string): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate + 'T12:00:00');
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
  return a;
}

/** Percentual da ficha preenchida (campos principais). */
const ESSENTIAL: ProfileKey[] = ['birthDate', 'gender', 'cpf', 'phone', 'street', 'city', 'guardian', 'guardianPhone', 'bloodType', 'currentClass', 'emergencyContact'];
export function completeness(m: Partial<Record<ProfileKey, string>>) {
  const filled = ESSENTIAL.filter((k) => (m[k] ?? '').toString().trim()).length;
  return Math.round((filled / ESSENTIAL.length) * 100);
}
