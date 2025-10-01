const { NodeSDK } = require('@opentelemetry/sdk-node');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { Resource } = require('@opentelemetry/resources');
const { SEMRESATTRS_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

console.log('📊 Initializing OpenTelemetry...', {
  serviceName: process.env.SERVICE_NAME || 'music-book-app',
  jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: process.env.SERVICE_NAME || 'music-book-app',
  }),
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

console.log('✅ OpenTelemetry initialized successfully');

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down OpenTelemetry SDK...');
  sdk.shutdown()
    .then(() => console.log('✅ OpenTelemetry SDK terminated cleanly'))
    .catch((error) => console.error('❌ Error terminating OpenTelemetry SDK:', error))
    .finally(() => process.exit(0));
});

module.exports = sdk;