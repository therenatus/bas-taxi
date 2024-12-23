import { createLogger, format, transports } from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const esTransportOpts = {
    level: 'info',
    clientOpts: { node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200' },
};

const esTransport = new ElasticsearchTransport(esTransportOpts);

const logger = createLogger({
    format: format.combine(
        format.timestamp(),
        format.json(),
    ),
    transports: [
        esTransport,
        new transports.Console(),
    ],
});

export default logger;