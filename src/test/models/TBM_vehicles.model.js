// tbm_vehicles-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (Schema, model) {
	const modelName = 'tbm_vehicles';
	const schema = new Schema({
		_id: { type: Number },
		etat: { type: String, required: true },
		rs_sv_ligne_a: { type: Number, ref: 'lines' },
		rg_sv_arret_p_nd: { type: Number, required: true, ref: 'stops' },
		rg_sv_arret_p_na: { type: Number, required: true, ref: 'stops'  },
		rs_sv_chem_l: { type: Number, ref: 'lines_routes' },
	}, {
		timestamps: true,
	});

	// This is necessary to avoid model compilation errors in watch mode
	// see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
	return model(modelName, schema);
  
};
