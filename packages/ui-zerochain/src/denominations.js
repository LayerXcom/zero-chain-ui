// const { setNetworkDefault, denominationInfo: { init } } = require('oo7-zerochain')
import {setNetworkDefault, denominationInfo } from 'oo7-zerochain';
/*
init({
	denominations: {
		bbq: 15,
	},
	primary: 'bbq',
	unit: 'birch',
	ticker: 'BBQ'
})
*/
setNetworkDefault(42)

/*const denominationInfoDOT = {
	denominations: {
		dot: 15,
		point: 12,
		µdot: 9,
	},
	primary: 'dot',
	unit: 'planck',
	ticker: 'DOT'
}*/
