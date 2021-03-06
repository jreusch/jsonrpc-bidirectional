const JSONRPC = {};
JSONRPC.Exception = require("./Exception");


module.exports =	
class Utils
{
	constructor()
	{
		Object.seal(this);
	}


	/**
	 * @param {string} strJSON
	 * 
	 * @returns {null|object|Array|string|boolean|number}
	 */
	static jsonDecodeSafe(strJSON)
	{
		if(typeof strJSON !== "string")
		{
			throw new JSONRPC.Exception("JSON needs to be a string; Input: " + JSON.stringify(strJSON), JSONRPC.Exception.PARSE_ERROR);
		}

		try
		{
			return JSON.parse(strJSON);
		}
		catch(error)
		{
			// V8 doesn't have a stacktrace for JSON.parse errors.
			// A re-throw is absolutely necessary to enable debugging.
			throw new JSONRPC.Exception(error.message + "; RAW JSON string: " + strJSON, JSONRPC.Exception.PARSE_ERROR);
		}
	}
};
