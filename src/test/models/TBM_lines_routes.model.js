// tbm_lines_routes-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (Schema, model) {
	const modelName = 'tbm_lines_routes';
	const schema = new Schema({
		_id: { type: Number },
		libelle: { type: String, required: true },
		sens: { type: String, required: true },
		vehicule: { type: String, required: true },
		rs_sv_ligne_a: { type: Number, required: true, ref: 'lines' },
		rg_sv_arret_p_nd: { type: Number, required: true, ref: 'stops' },
		rg_sv_arret_p_na: { type: Number, required: true, ref: 'stops' },
	}, {
		timestamps: true,
		toObject: { virtuals: true },
	});

	// This is necessary to avoid model compilation errors in watch mode
	// see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
	return model(modelName, schema);
  
};
