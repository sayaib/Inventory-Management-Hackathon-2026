export const ROLES = {
  ADMIN: 'admin',
  INVENTORY_MANAGER: 'inventory_manager',
  PROCUREMENT: 'procurement',
  PROJECT_MANAGER: 'project_manager',
  SALES_HEAD: 'sales_head',
  PRESALE: 'presale',
  FINANCE: 'finance'
};

export const FEATURES = {
  [ROLES.ADMIN]: [
    'ERP integrations',
    'Configure alerts & thresholds',
    'User management',
    'Audit logs'
  ],
  [ROLES.INVENTORY_MANAGER]: [
    'View real-time stock',
    'Track consumption',
    'Approve stock movements',
    'Monitor low stock alerts'
  ],
  [ROLES.PROCUREMENT]: [
    'View demand predictions',
    'Auto-generate purchase requests',
    'Vendor tracking',
    'Lead time insights'
  ],
  [ROLES.PROJECT_MANAGER]: [
    'See allocated materials per project',
    'Track usage vs planned',
    'Detect overconsumption',
    'Raise BOM change requests'
  ],
  [ROLES.SALES_HEAD]: [
    'Create projects (IWO-based)',
    'Capture department',
    'Add descriptions'
  ],
  [ROLES.PRESALE]: [
    'BOM dashboard',
    'View projects by department',
    'Prepare BOM requirements'
  ],
  [ROLES.FINANCE]: [
    'Inventory valuation',
    'Cost tracking',
    'Loss/wastage analytics'
  ]
};
