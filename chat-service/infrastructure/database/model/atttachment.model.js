export default (sequelize, DataTypes) => {
    const Attachment = sequelize.define('Attachment', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        url: {
            type: DataTypes.STRING(512),
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('image', 'document', 'audio', 'video'),
            allowNull: false
        },
        metadata: {
            type: DataTypes.JSON
        },
        message_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'messages',
                key: 'id'
            }
        }
    }, {
        tableName: 'attachments',
        timestamps: true,
        indexes: [
            {
                fields: ['message_id']
            }
        ]
    });

    return Attachment;
};