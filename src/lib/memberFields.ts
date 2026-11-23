// Ficha cadastral do membro (campos equivalentes aos do SGC).
// Esta lista alimenta o formulário, a importação/exportação de planilhas e o registro de alterações.

export type Section = 'cadastro' | 'saude' | 'endereco' | 'clube';

export const SECTIONS: { id: Section; label: string }[] = [
  { id: 'cadastro', label: 'Dados cadastrais' },
  { id: 'saude', label: 'Saúde e vacinação' },
  { id: 'endereco', label: 'Endereço e família' },
  { id: 'clube', label: 'Igreja e clube' },
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

/** Vacinas do Calendário Nacional de Vacinação (crianças e adolescentes) e campanhas. */
export const VACCINES = [
  'BCG (tuberculose)',
  'Hepatite B',
  'Pentavalente / DTP (difteria, tétano e coqueluche)',
  'Poliomielite (VIP/VOP)',
  'Rotavírus',
  'Pneumocócica',
  'Meningocócica C / ACWY',
  'Febre amarela',
  'Tríplice viral (sarampo, caxumba e rubéola)',
  'Hepatite A',
  'Varicela (catapora)',
  'HPV',
  'dT / dTpa (difteria e tétano – reforço)',
  'Influenza (gripe) – última campanha',
  'COVID-19',
];

export const PROFILE_KEYS = [
  'age', 'birthDate', 'gender', 'cpf', 'rg', 'shirtSize', 'phone', 'guardian', 'guardianPhone', 'guardianRelation',
  'email', 'street', 'number', 'district', 'city', 'state', 'zip', 'fatherName', 'fatherPhone', 'motherName', 'motherPhone',
  'bloodType', 'healthConditions', 'allergies', 'medications', 'healthPlan', 'susCard', 'emergencyContact',
  'vaccines', 'vaccinesOther', 'vaccineCardUpToDate', 'photo',
  'baptized', 'baptismDate', 'church',
  'joinDate', 'currentClass', 'completedClasses', 'specialties', 'investitures', 'insurance', 'sgcId', 'notes',
] as const;

export type ProfileKey = (typeof PROFILE_KEYS)[number];

export interface FieldDef {
  key: ProfileKey;
  label: string;
  section: Section;
  type?: 'text' | 'date' | 'select' | 'textarea' | 'tel' | 'email' | 'number';
  options?: string[];
  full?: boolean;
  placeholder?: string;
  required?: boolean;
  aliases?: string[]; // nomes alternativos de coluna para importar planilhas
}

/**
 * Campos comuns do formulário (texto, data, lista).
 * Nome, unidade, função, foto e vacinas têm componentes próprios.
 */
export const FIELDS: FieldDef[] = [
  // Dados cadastrais
  { key: 'age', label: 'Idade', section: 'cadastro', type: 'number', required: true, placeholder: 'Ex.: 12', aliases: ['idade'] },
  { key: 'birthDate', label: 'Data de nascimento', section: 'cadastro', type: 'date', aliases: ['nascimento', 'data nascimento', 'dt nascimento'] },
  { key: 'gender', label: 'Sexo', section: 'cadastro', type: 'select', options: ['Masculino', 'Feminino'] },
  { key: 'shirtSize', label: 'Tamanho do uniforme', section: 'cadastro', type: 'select', options: ['PP', 'P', 'M', 'G', 'GG', 'XG', '8', '10', '12', '14', '16'], aliases: ['tamanho', 'camiseta'] },
  { key: 'cpf', label: 'CPF', section: 'cadastro', placeholder: '000.000.000-00' },
  { key: 'rg', label: 'RG / Certidão de nascimento', section: 'cadastro', aliases: ['rg', 'identidade', 'documento', 'certidao'] },
  { key: 'phone', label: 'Telefone de contato', section: 'cadastro', type: 'tel', placeholder: '(00) 00000-0000', aliases: ['telefone', 'celular', 'whatsapp', 'fone', 'contato'] },
  { key: 'guardian', label: 'Responsável legal', section: 'cadastro', aliases: ['responsavel', 'nome do responsavel'] },
  { key: 'guardianPhone', label: 'Telefone do responsável', section: 'cadastro', type: 'tel', placeholder: '(00) 00000-0000', aliases: ['telefone responsavel'] },
  { key: 'guardianRelation', label: 'Parentesco', section: 'cadastro', type: 'select', options: ['Mãe', 'Pai', 'Avó / Avô', 'Tia / Tio', 'Irmã / Irmão', 'Outro'], aliases: ['parentesco'] },

  // Saúde e vacinação
  { key: 'bloodType', label: 'Tipo sanguíneo', section: 'saude', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Não sabe'], aliases: ['tipo sanguineo', 'sangue', 'fator rh'] },
  { key: 'emergencyContact', label: 'Contato de emergência', section: 'saude', placeholder: 'Nome e telefone', aliases: ['emergencia'] },
  { key: 'healthPlan', label: 'Plano de saúde', section: 'saude', aliases: ['convenio'] },
  { key: 'susCard', label: 'Cartão do SUS', section: 'saude', aliases: ['sus', 'cartao sus'] },
  { key: 'healthConditions', label: 'Condições de saúde', section: 'saude', type: 'textarea', full: true, placeholder: 'Doenças crônicas, restrições físicas, cirurgias, cuidados especiais…', aliases: ['problemas de saude', 'doencas', 'condicoes', 'restricoes'] },
  { key: 'allergies', label: 'Alergias', section: 'saude', type: 'textarea', full: true, placeholder: 'Alimentos, medicamentos, picadas de inseto…', aliases: ['alergia'] },
  { key: 'medications', label: 'Medicamentos de uso contínuo', section: 'saude', type: 'textarea', full: true, placeholder: 'Nome, dose e horário', aliases: ['medicamentos', 'remedios'] },
  { key: 'vaccineCardUpToDate', label: 'Caderneta de vacinação', section: 'saude', type: 'select', options: ['Em dia', 'Atrasada', 'Não apresentada'], aliases: ['caderneta', 'carteira de vacinacao'] },
  { key: 'vaccinesOther', label: 'Outras vacinas / observações', section: 'saude', type: 'textarea', full: true, aliases: ['outras vacinas'] },

  // Endereço e família
  { key: 'email', label: 'E-mail', section: 'endereco', type: 'email' },
  { key: 'zip', label: 'CEP', section: 'endereco' },
  { key: 'street', label: 'Logradouro', section: 'endereco', full: true, aliases: ['endereco', 'rua'] },
  { key: 'number', label: 'Número', section: 'endereco', aliases: ['numero', 'nº'] },
  { key: 'district', label: 'Bairro', section: 'endereco' },
  { key: 'city', label: 'Cidade', section: 'endereco', aliases: ['municipio'] },
  { key: 'state', label: 'UF', section: 'endereco', aliases: ['estado'] },
  { key: 'motherName', label: 'Nome da mãe', section: 'endereco', aliases: ['mae'] },
  { key: 'motherPhone', label: 'Telefone da mãe', section: 'endereco', type: 'tel' },
  { key: 'fatherName', label: 'Nome do pai', section: 'endereco', aliases: ['pai'] },
  { key: 'fatherPhone', label: 'Telefone do pai', section: 'endereco', type: 'tel' },

  // Igreja e clube
  { key: 'church', label: 'Igreja', section: 'clube', aliases: ['igreja local'] },
  { key: 'baptized', label: 'Batizado(a)', section: 'clube', type: 'select', options: ['Sim', 'Não'], aliases: ['batizado'] },
  { key: 'baptismDate', label: 'Data do batismo', section: 'clube', type: 'date' },
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
  ({ name: 'Nome completo', unitId: 'Unidade', role: 'Função', active: 'Situação', vaccines: 'Vacinas', photo: 'Foto' })[key] ??
  FIELDS.find((f) => f.key === key)?.label ??
  key;

/** Idade calculada pela data de nascimento; se não houver, usa a idade informada. */
export function age(m: { birthDate?: string; age?: string } | undefined | null): number | null {
  if (!m) return null;
  if (m.birthDate) {
    const b = new Date(m.birthDate + 'T12:00:00');
    if (!Number.isNaN(b.getTime())) {
      const now = new Date();
      let a = now.getFullYear() - b.getFullYear();
      if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
      return a;
    }
  }
  const n = parseInt(m.age ?? '', 10);
  return Number.isFinite(n) ? n : null;
}

export const vaccineList = (v?: string) => (v ? v.split('\n').map((x) => x.trim()).filter(Boolean) : []);

/** Percentual da ficha preenchida (itens essenciais). */
export function completeness(m: Partial<Record<ProfileKey, string>>) {
  const checks = [
    !!(m.age || m.birthDate),
    !!(m.cpf || m.rg),
    !!(m.phone || m.guardianPhone),
    !!m.guardian,
    !!m.bloodType,
    !!m.emergencyContact,
    vaccineList(m.vaccines).length > 0 || !!m.vaccineCardUpToDate,
    !!m.photo,
    !!m.gender,
    !!m.currentClass,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
