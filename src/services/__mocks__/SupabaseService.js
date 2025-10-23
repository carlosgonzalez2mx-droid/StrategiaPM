/**
 * Mock de SupabaseService para tests
 */

const mockSupabaseService = {
  initialize: jest.fn().mockResolvedValue(true),
  getCurrentUser: jest.fn().mockResolvedValue(null),
  getCurrentOrganization: jest.fn().mockResolvedValue(null),
  isAuthenticated: jest.fn().mockResolvedValue(false),
  detectUserOrganization: jest.fn().mockResolvedValue(null),
  loadPortfolioData: jest.fn().mockResolvedValue({
    projects: [],
    tasks: [],
    risks: [],
    purchaseOrders: [],
    advances: [],
    invoices: [],
    contracts: [],
    minutas: [],
    workPackages: [],
    globalResources: [],
    resourceAssignments: [],
    auditLogs: [],
  }),
  savePortfolioData: jest.fn().mockResolvedValue(true),
  deleteProject: jest.fn().mockResolvedValue(true),
  getOrganizationMembers: jest.fn().mockResolvedValue([]),
  addOrganizationMember: jest.fn().mockResolvedValue(true),
  updateMemberRole: jest.fn().mockResolvedValue(true),
  removeMemberFromOrganization: jest.fn().mockResolvedValue(true),
};

export default mockSupabaseService;
