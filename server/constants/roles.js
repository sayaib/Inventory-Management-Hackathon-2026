const ROLES = {
  ADMIN: 'admin',
  INVENTORY_MANAGER: 'inventory_manager',
  PROCUREMENT: 'procurement',
  PROJECT_MANAGER: 'project_manager',
  WAREHOUSE: 'warehouse',
  FINANCE: 'finance'
};

const FEATURES = {
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
    'Detect overconsumption'
  ],
  [ROLES.WAREHOUSE]: [
    'Scan items (QR/barcode)',
    'Update stock (in/out)',
    'Real-time sync'
  ],
  [ROLES.FINANCE]: [
    'Inventory valuation',
    'Cost tracking',
    'Loss/wastage analytics'
  ]
};

module.exports = { ROLES, FEATURES };
