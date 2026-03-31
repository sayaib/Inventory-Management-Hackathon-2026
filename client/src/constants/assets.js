export const ASSET_CATEGORIES = ['hardware', 'software', 'consumable', 'device', 'license'];
export const ASSET_STATUSES = ['active', 'in use', 'damaged', 'retired'];
export const ASSET_LOCATIONS = ['warehouse', 'office', 'lab'];
export const DEPARTMENTS = ['Sales', 'Accounts', 'IT', 'IoT', 'DTMA', 'PES', 'ATE'];

export const DEPT_FIELDS = {
  Sales: [
    { name: 'clientAssigned', label: 'Client Assigned', type: 'text' },
    { name: 'demoUnit', label: 'Demo Unit', type: 'checkbox' },
    { name: 'returnDate', label: 'Return Date', type: 'date' },
    { name: 'dealId', label: 'Deal ID', type: 'text' }
  ],
  Accounts: [
    { name: 'depreciationValue', label: 'Depreciation Value', type: 'number' },
    { name: 'taxCategory', label: 'Tax Category', type: 'text' },
    { name: 'budgetCode', label: 'Budget Code', type: 'text' },
    { name: 'costCenter', label: 'Cost Center', type: 'text' }
  ],
  IT: [
    { name: 'serialNumber', label: 'Serial Number', type: 'text' },
    { name: 'macAddress', label: 'MAC Address', type: 'text' },
    { name: 'ipAddress', label: 'IP Address', type: 'text' },
    { name: 'osVersion', label: 'OS Version', type: 'text' },
    { name: 'installedSoftware', label: 'Installed Software (comma separated)', type: 'text' },
    { name: 'securityStatus', label: 'Security Status', type: 'text' }
  ],
  IoT: [
    { name: 'deviceId', label: 'Device ID', type: 'text' },
    { name: 'firmwareVersion', label: 'Firmware Version', type: 'text' },
    { name: 'connectivityType', label: 'Connectivity Type', type: 'text' },
    { name: 'sensorType', label: 'Sensor Type', type: 'text' },
    { name: 'apiEndpoint', label: 'API Endpoint', type: 'text' },
    { name: 'batteryStatus', label: 'Battery Status', type: 'text' }
  ],
  DTMA: [
    { name: 'calibrationDate', label: 'Calibration Date', type: 'date' },
    { name: 'testType', label: 'Test Type', type: 'text' },
    { name: 'accuracyRange', label: 'Accuracy Range', type: 'text' },
    { name: 'certificationStatus', label: 'Certification Status', type: 'text' }
  ],
  PES: [
    { name: 'calibrationDate', label: 'Calibration Date', type: 'date' },
    { name: 'testType', label: 'Test Type', type: 'text' },
    { name: 'accuracyRange', label: 'Accuracy Range', type: 'text' },
    { name: 'certificationStatus', label: 'Certification Status', type: 'text' }
  ],
  ATE: [
    { name: 'calibrationDate', label: 'Calibration Date', type: 'date' },
    { name: 'testType', label: 'Test Type', type: 'text' },
    { name: 'accuracyRange', label: 'Accuracy Range', type: 'text' },
    { name: 'certificationStatus', label: 'Certification Status', type: 'text' }
  ]
};
