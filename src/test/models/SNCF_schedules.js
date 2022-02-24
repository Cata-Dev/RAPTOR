// sncf_schedules-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (Schema, model) {
	const modelName = 'sncf_route_schedules';
	const schema = new Schema({
		_id: { type: String },
		realtime: { type: Date, required: true },
		trip: { type: Number, required: true }, //implicitly includes direction
        stop_point: { type: String, required: true, ref: 'sncf_stops' },
        route: { type: String, required: true, ref: 'sncf_routes' },
	}, {
		timestamps: true,
	});

	// This is necessary to avoid model compilation errors in watch mode
	// see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
	return model(modelName, schema);
  
};
