export const superAdminMiddleware = (req, res, next) => {
    const { role } = req.user;

    if (role !== 'superadmin', role !== 'admin') {
        return res.status(403).json({ message: 'Доступ разрешен только супер-администраторам' });
    }

    next();
};
