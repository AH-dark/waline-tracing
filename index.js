const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const {
  envDetector,
  hostDetector,
  processDetector,
  Resource,
} = require("@opentelemetry/resources");
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");
const { BatchSpanProcessor } = require("@opentelemetry/sdk-trace-node");
const {
  OTLPTraceExporter: OTLPGRPCTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-grpc");
const {
  OTLPTraceExporter: OTLPHTTPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");

const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || "ahdark-comment-waline",
    [SemanticResourceAttributes.SERVICE_NAMESPACE]:
      process.env.SERVICE_NAMESPACE || "ahdark-comment",
    [SemanticResourceAttributes.WEBENGINE_NAME]: "Vercel",
  }),
);

const exporter = (() => {
  switch (process.env.OTEL_EXPORTER_OTLP_PROTOCOL) {
    case "http":
      return new OTLPHTTPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
      });
    case "grpc":
    default:
      return new OTLPGRPCTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "localhost:4317",
      });
  }
})();

const spanProcessor = new BatchSpanProcessor(exporter, {
  maxQueueSize: parseInt(process.env.OTEL_BSP_MAX_QUEUE_SIZE) || 1000,
  maxExportBatchSize: parseInt(process.env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE) || 1000,
  scheduledDelayMillis: parseInt(process.env.OTEL_BSP_SCHEDULE_DELAY_MILLIS) || 5000,
  exportTimeoutMillis: parseInt(process.env.OTEL_BSP_EXPORT_TIMEOUT_MILLIS) || 30000,
});

/** @type {NodeSDK} */
const sdk = new NodeSDK({
  spanProcessor,
  resource,
  autoDetectResources: true,
  resourceDetectors: [envDetector, hostDetector, processDetector],
  instrumentations: [getNodeAutoInstrumentations()],
});

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => sdk.shutdown().catch(console.error));
});

sdk.start();

console.log("OpenTelemetry initialized");
