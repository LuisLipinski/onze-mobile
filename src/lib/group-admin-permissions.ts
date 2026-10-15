import type { GroupAdminPermission } from './api';

export const GROUP_ADMIN_PERMISSIONS: {
  value: GroupAdminPermission;
  label: string;
  description: string;
}[] = [
  { value: 'ADD_MEMBERS', label: 'Adicionar membros', description: 'Gerar, renovar e compartilhar o convite do grupo.' },
  { value: 'REMOVE_MEMBERS', label: 'Remover membros', description: 'Retirar membros comuns. Administradores precisam ser rebaixados pelo Principal antes.' },
  { value: 'PROMOTE_MEMBERS', label: 'Promover membros', description: 'Promover um membro a administrador, inicialmente sem permissões.' },
  { value: 'EDIT_GROUP', label: 'Editar grupo', description: 'Alterar foto, cidade, local, mascote, horários e padrões de pagamento e PIX.' },
  { value: 'SCHEDULE_GAMES', label: 'Marcar e configurar jogos', description: 'Criar jogos avulsos ou semanais, definir prazos, modalidade, vagas, tempos, prorrogação e pênaltis; ajustar o mínimo e o limite de jogadores; autorizar jogar abaixo do mínimo ou prorrogar inscrições.' },
  { value: 'CANCEL_GAMES', label: 'Cancelar jogos', description: 'Cancelar um jogo ou encerrar a série de jogos semanais.' },
  { value: 'MANAGE_MATCH_PLAYERS', label: 'Gerenciar lista de jogadores', description: 'Adicionar reposições e convidados, escolher goleiros e adicionar ou remover goleiros de aluguel e convidados.' },
  { value: 'MANAGE_PAYMENTS', label: 'Gerenciar finanças', description: 'Consultar pagamentos e créditos dos jogadores, confirmar pagamentos e registrar reembolsos ou créditos quando o acerto estiver liberado.' },
  { value: 'MANAGE_TEAMS', label: 'Gerenciar escalações', description: 'Formar e equilibrar times, trocar jogadores e posições e organizar titulares e reservas. As notas técnicas exigem a permissão de perfis esportivos.' },
  { value: 'MANAGE_LIVE_MATCH', label: 'Controlar jogo ao vivo', description: 'Definir nomes e escudos dos times; iniciar, encerrar e reiniciar o jogo; controlar tempos, acréscimos e disputa de pênaltis; registrar e corrigir gols, cartões, faltas, pênaltis e estatísticas.' },
  { value: 'EDIT_PLAYER_PROFILES', label: 'Editar perfis e avaliações', description: 'Consultar e editar posições, opção de goleiro, pé dominante e avaliações técnicas de membros e convidados, com estrelas e overalls.' },
  { value: 'MANAGE_TEST_DATA', label: 'Usar ferramentas de teste', description: 'Gerar jogadores artificiais, aplicar cenários e adicionar ou remover jogadores de teste. Disponível somente no ambiente de desenvolvimento.' },
];

export const GROUP_ADMIN_PERMISSION_LABELS = Object.fromEntries(
  GROUP_ADMIN_PERMISSIONS.map(({ value, label }) => [value, label]),
) as Record<GroupAdminPermission, string>;
