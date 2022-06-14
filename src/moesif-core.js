/* eslint camelcase: "off" */
import moesifCreator from './moesif';

/*
 * Moesif Browser JS Library
 *
 * Copyright 2017, Moesif Inc. All Rights Reserved
 */

// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @output_file_name moesif-1.0.min.js
// ==/ClosureCompiler==

/*
SIMPLE STYLE GUIDE:

this.x === public function
this._x === internal - only use within this file
this.__x === private - only use within the class

Globals should be all caps
*/

var init_type;       // MODULE or SNIPPET loader
var INIT_MODULE  = 0;
var INIT_SNIPPET = 1;

/*
 * Constants
 */
/** @const */   var PRIMARY_INSTANCE_NAME     = 'moesif';


// var DOM_LOADED = false;

export function init_from_snippet() {
  init_type = INIT_SNIPPET;
  window[PRIMARY_INSTANCE_NAME] = moesifCreator();
  window[PRIMARY_INSTANCE_NAME]['new'] = moesifCreator;
}

export function init_as_module() {
  init_type = INIT_MODULE;
  var instance = moesifCreator();
  instance['new'] = moesifCreator;
  return instance;
}
