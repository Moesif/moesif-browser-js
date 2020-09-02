import config from './config';
import { _, console } from './utils';

var MOESIF_CONSTANTS = {
  STORED_USER_ID: 'moesif_stored_user_id',
  STORED_COMPANY_ID: 'moesif_stored_company_id',
  STORED_SESSION_ID: 'moesif_stored_session_id'
};

this._userId = localStorage.getItem(MOESIF_CONSTANTS.STORED_USER_ID);
this._session = localStorage.getItem(MOESIF_CONSTANTS.STORED_SESSION_ID);
this._companyId = localStorage.getItem(MOESIF_CONSTANTS.STORED_COMPANY_ID);


function getStorageObject(opt) {
  var storageType = opt['storage_type'];
  if (storageType !== 'cookie' && storageType !== 'localStorage') {
    return _.cookie;
  }

}
