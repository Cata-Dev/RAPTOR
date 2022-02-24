// sncf_stops-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (Schema, model) {
	const modelName = 'sncf_stops';
	const schema = new Schema({
		_id: { type: Number },
		coords: { type: Array, required: true },
		name: { type: String, required: true },
		name_lowercase: { type: String, required: true },
	}, {
		timestamps: true,
	});

	// This is necessary to avoid model compilation errors in watch mode
	// see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
	return model(modelName, schema);
  
};
