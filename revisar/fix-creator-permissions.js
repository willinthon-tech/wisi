const { sequelize, User, Module, Permission, UserModulePermission } = require('./models');

async function fixCreatorPermissions() {
  try {
    
    
    // Buscar el usuario creador
    const creator = await User.findOne({ where: { usuario: 'willinthon' } });
    if (!creator) {
      
      return;
    }
    
    
    
    // Obtener todos los módulos
    const modules = await Module.findAll();
    
    
    // Obtener todos los permisos
    const permissions = await Permission.findAll();
    
    
    // Eliminar permisos existentes del creador
    await UserModulePermission.destroy({ where: { user_id: creator.id } });
    
    
    // Crear todos los permisos para todos los módulos
    let createdCount = 0;
    for (const module of modules) {
      for (const permission of permissions) {
        await UserModulePermission.create({
          user_id: creator.id,
          module_id: module.id,
          permission_id: permission.id
        });
        createdCount++;
      }
    }
    
    
    
    
  } catch (error) {
    
  } finally {
    await sequelize.close();
  }
}

fixCreatorPermissions();
