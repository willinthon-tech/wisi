const { sequelize, User, Module, Permission, UserModulePermission } = require('./models');

async function fixCreatorPermissions() {
  try {
    console.log('🔧 Iniciando corrección de permisos del usuario creador...');
    
    // Buscar el usuario creador
    const creator = await User.findOne({ where: { usuario: 'willinthon' } });
    if (!creator) {
      console.log('❌ Usuario creador no encontrado');
      return;
    }
    
    console.log(`✅ Usuario creador encontrado: ${creator.nombre_apellido}`);
    
    // Obtener todos los módulos
    const modules = await Module.findAll();
    console.log(`📋 Módulos encontrados: ${modules.length}`);
    
    // Obtener todos los permisos
    const permissions = await Permission.findAll();
    console.log(`🔑 Permisos encontrados: ${permissions.length}`);
    
    // Eliminar permisos existentes del creador
    await UserModulePermission.destroy({ where: { user_id: creator.id } });
    console.log('🗑️ Permisos anteriores eliminados');
    
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
    
    console.log(`✅ Permisos creados: ${createdCount}`);
    console.log('🎉 Corrección completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixCreatorPermissions();
