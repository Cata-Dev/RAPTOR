// sections-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (Schema, model) {
	const modelName = 'sections';
	const schema = new Schema({
		coords: { type: Array, required: true },
		distance: { type: Number, required: true },
		_id: { type: Number },
		domanial: { type: Number, required: true },
		groupe: { type: Number, required: true },
		nom_voie: { type: String, required: true },
		rg_fv_graph_dbl: { type: Boolean, required: true },
		rg_fv_graph_nd: { type: Number, required: true, ref: 'nodes' },
		rg_fv_graph_na: { type: Number, required: true, ref: 'nodes' },
	}, {
		timestamps: true,
	});

	// This is necessary to avoid model compilation errors in watch mode
	// see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
	return model(modelName, schema);

};
