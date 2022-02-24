// tbm_lines-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (Schema, model) {
	const modelName = 'tbm_lines';
	const schema = new Schema({
		_id: { type: Number },
		libelle: { type: String, required: true },
		vehicule: { type: String, required: true },
		active: { type: Number, required: true },
	}, {
		timestamps: true
	});

	// This is necessary to avoid model compilation errors in watch mode
	// see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
	return model(modelName, schema);
  
};
