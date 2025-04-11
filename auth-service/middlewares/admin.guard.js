export const superAdminMiddleware = (req, res, next) => {
    console.log({ user: req.user });
    const { role } = req.user;
    console.log({ role })
    console.log(role !== 'superadmin' || role !== 'admin');
    if (role !== 'superadmin') {
        return res.status(403).json({ message: 'Доступ разрешен только супер-администраторам' });
    }

    next();
};
