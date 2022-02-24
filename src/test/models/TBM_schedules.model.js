// tbm_schedules-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (Schema, model) {
	const modelName = 'tbm_schedules';
	const schema = new Schema({
		_id: { type: Number },
		hor_theo: { type: Date, required: true },
		hor_app: { type: Date, required: true },
		hor_estime: { type: Date, required: true },
		etat: { type: String, required: true },
		type: { type: String, required: true }, //donnée incertaine
		rs_sv_arret_p: { type: Number, required: true, ref: 'stops' },
		rs_sv_cours_a: { type: Number, required: true, ref: 'vehicles' },
	}, {
		timestamps: true,
	});

	// This is necessary to avoid model compilation errors in watch mode
	// see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
	return model(modelName, schema);
  
};
