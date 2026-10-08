const bcrypt = require('bcryptjs');
const prisma = require('./prisma');

// Catálogo Real Completo del Usuario
const realMedicalProducts = [
  // A. MATERIAL DE CURACIÓN Y FIJACIÓN
  { category: 'Material de Curación y Fijación', name: 'Gasa Estéril de 7.5 x 5 cm. c/100 piezas', unit: 'Caja', salePrice: 70.00, stock: 25, minStock: 5 },
  { category: 'Material de Curación y Fijación', name: 'Gasa Estéril de 10 x 10 cm. c/100 piezas', unit: 'Caja', salePrice: 105.00, stock: 30, minStock: 5 },
  { category: 'Material de Curación y Fijación', name: 'Gasa No Estéril de 7.5 x 5 cm. c/200 piezas', unit: 'Paquete', salePrice: 70.00, stock: 20, minStock: 5 },
  { category: 'Material de Curación y Fijación', name: 'Gasa No Estéril de 10 x 10 cm. c/200 piezas. Sin Trama', unit: 'Paquete', salePrice: 140.00, stock: 15, minStock: 5 },
  { category: 'Material de Curación y Fijación', name: 'Compresa de Gasa Quirúrgica para Vientre Estéril de 75 x 45 cm. c/5 piezas', unit: 'Paquete', salePrice: 174.00, stock: 12, minStock: 3 },
  { category: 'Material de Curación y Fijación', name: 'Algodón Absorbente de 100 grs', unit: 'Pieza', salePrice: 30.00, stock: 40, minStock: 10 },
  { category: 'Material de Curación y Fijación', name: 'Algodón Absorbente de 200 grs', unit: 'Pieza', salePrice: 52.00, stock: 25, minStock: 8 },
  { category: 'Material de Curación y Fijación', name: 'Algodón Absorbente de 500 grs', unit: 'Pieza', salePrice: 116.00, stock: 18, minStock: 5 },
  { category: 'Material de Curación y Fijación', name: 'Venda Elástica de 5 cm', unit: 'Pieza', salePrice: 5.00, stock: 100, minStock: 20 },
  { category: 'Material de Curación y Fijación', name: 'Venda Elástica de 7.5 cm', unit: 'Pieza', salePrice: 7.00, stock: 100, minStock: 20 },
  { category: 'Material de Curación y Fijación', name: 'Venda Elástica de 10 cm', unit: 'Pieza', salePrice: 9.00, stock: 80, minStock: 20 },
  { category: 'Material de Curación y Fijación', name: 'Venda Elástica de 15 cm', unit: 'Pieza', salePrice: 12.00, stock: 60, minStock: 15 },
  { category: 'Material de Curación y Fijación', name: 'Cinta Micropore de 1.25 cm, Color Blanco c/24 piezas', unit: 'Caja', salePrice: 170.00, stock: 15, minStock: 4 },
  { category: 'Material de Curación y Fijación', name: 'Cinta Micropore de 2.5 cm, Color Blanco c/12 piezas', unit: 'Caja', salePrice: 170.00, stock: 18, minStock: 4 },
  { category: 'Material de Curación y Fijación', name: 'Cinta Micropore de 5 cm, Color Blanco c/6 piezas', unit: 'Caja', salePrice: 170.00, stock: 14, minStock: 4 },
  { category: 'Material de Curación y Fijación', name: 'Cinta Micropore de 1.25 cm, Color Piel c/24 piezas', unit: 'Caja', salePrice: 300.00, stock: 10, minStock: 3 },
  { category: 'Material de Curación y Fijación', name: 'Cinta Micropore de 2.5 cm, Color Piel c/12 piezas', unit: 'Caja', salePrice: 300.00, stock: 12, minStock: 3 },
  { category: 'Material de Curación y Fijación', name: 'Cinta Micropore de 5 cm, Color Piel c/6 piezas', unit: 'Caja', salePrice: 300.00, stock: 8, minStock: 3 },
  { category: 'Material de Curación y Fijación', name: 'Tela Adhesiva de 2.5 cm. c/12 piezas', unit: 'Caja', salePrice: 450.00, stock: 10, minStock: 2 },
  { category: 'Material de Curación y Fijación', name: 'Tela Adhesiva de 5 cm. c/6 piezas', unit: 'Caja', salePrice: 450.00, stock: 10, minStock: 2 },
  { category: 'Material de Curación y Fijación', name: 'Apósito Absorbente Estéril de 20 x 8 cm', unit: 'Pieza', salePrice: 15.00, stock: 50, minStock: 10 },
  { category: 'Material de Curación y Fijación', name: 'Apósito Transparente para Fijación IV de 6.5 x 7 cm. c/100 piezas', unit: 'Caja', salePrice: 2125.00, stock: 6, minStock: 2 },
  { category: 'Material de Curación y Fijación', name: 'Malla Tubular Elástica # 1', unit: 'Pieza', salePrice: 30.00, stock: 20, minStock: 5 },
  { category: 'Material de Curación y Fijación', name: 'Malla Tubular Elástica # 2', unit: 'Pieza', salePrice: 30.00, stock: 20, minStock: 5 },
  { category: 'Material de Curación y Fijación', name: 'Malla Tubular Elástica # 3', unit: 'Pieza', salePrice: 33.00, stock: 18, minStock: 5 },
  { category: 'Material de Curación y Fijación', name: 'Malla Tubular Elástica # 4', unit: 'Pieza', salePrice: 33.00, stock: 18, minStock: 5 },
  { category: 'Material de Curación y Fijación', name: 'Malla Tubular Elástica # 5', unit: 'Pieza', salePrice: 33.00, stock: 15, minStock: 4 },
  { category: 'Material de Curación y Fijación', name: 'Malla Tubular Elástica # 6', unit: 'Pieza', salePrice: 47.00, stock: 15, minStock: 4 },

  // B. GUANTES Y BARRERAS DE PROTECCIÓN
  { category: 'Guantes y Protección', name: 'Guante de Nitrilo No Estéril (Chico, Mediano, Grande) c/100 piezas', unit: 'Caja', salePrice: 120.00, stock: 45, minStock: 10 },
  { category: 'Guantes y Protección', name: 'Guante de Exploración Látex No Estéril (Chico, Mediano, Grande) c/100 piezas', unit: 'Caja', salePrice: 110.00, stock: 40, minStock: 10 },
  { category: 'Guantes y Protección', name: 'Guante Quirúrgico Estéril No. 6.5. c/50 pares', unit: 'Caja', salePrice: 285.00, stock: 15, minStock: 3 },
  { category: 'Guantes y Protección', name: 'Guante Quirúrgico Estéril No. 7. c/50 pares', unit: 'Caja', salePrice: 285.00, stock: 20, minStock: 5 },
  { category: 'Guantes y Protección', name: 'Guante Quirúrgico Estéril No. 7.5. c/50 pares', unit: 'Caja', salePrice: 285.00, stock: 25, minStock: 5 },
  { category: 'Guantes y Protección', name: 'Guante Quirúrgico Estéril No. 8. c/50 pares', unit: 'Caja', salePrice: 285.00, stock: 15, minStock: 3 },
  { category: 'Guantes y Protección', name: 'Cubrebocas Quirúrgico Triple Capa c/50 piezas. Ambiderm', unit: 'Caja', salePrice: 70.00, stock: 50, minStock: 10 },
  { category: 'Guantes y Protección', name: 'Cubrebocas Quirúrgico Triple Capa c/50 piezas. DL', unit: 'Caja', salePrice: 60.00, stock: 50, minStock: 10 },
  { category: 'Guantes y Protección', name: 'Gorro Desechable Plisado p/Enfermera/Paciente c/100 piezas', unit: 'Paquete', salePrice: 55.00, stock: 30, minStock: 5 },
  { category: 'Guantes y Protección', name: 'Gorro Desechable para Cirujano c/100 piezas', unit: 'Paquete', salePrice: 80.00, stock: 25, minStock: 5 },
  { category: 'Guantes y Protección', name: 'Bata Quirúrgica Desechable Manga Larga Estéril', unit: 'Pieza', salePrice: 30.00, stock: 60, minStock: 15 },

  // C. JERINGAS, AGUJAS Y ADMINISTRACIÓN
  { category: 'Jeringas y Agujas', name: 'Jeringa Estéril de 1 ml (Tuberculina) c/100 piezas [Sobre Pedido]', unit: 'Caja', salePrice: 210.00, stock: 8, minStock: 2 },
  { category: 'Jeringas y Agujas', name: 'Jeringa Estéril de 3 ml Sin Aguja c/100 piezas', unit: 'Caja', salePrice: 170.00, stock: 20, minStock: 5 },
  { category: 'Jeringas y Agujas', name: 'Jeringa Estéril de 3 ml Con Aguja c/100 piezas. Ambiderm', unit: 'Caja', salePrice: 140.00, stock: 35, minStock: 8 },
  { category: 'Jeringas y Agujas', name: 'Jeringa Estéril de 3 ml Con Aguja c/100 piezas. Nipro', unit: 'Caja', salePrice: 200.00, stock: 25, minStock: 5 },
  { category: 'Jeringas y Agujas', name: 'Jeringa Estéril de 5 ml Sin Aguja c/100 piezas', unit: 'Caja', salePrice: 185.00, stock: 15, minStock: 4 },
  { category: 'Jeringas y Agujas', name: 'Jeringa Estéril de 5 ml Con Aguja c/100 piezas. Ambiderm', unit: 'Caja', salePrice: 140.00, stock: 40, minStock: 10 },
  { category: 'Jeringas y Agujas', name: 'Jeringa Estéril de 5 ml Con Aguja c/100 piezas. Nipro', unit: 'Caja', salePrice: 220.00, stock: 25, minStock: 5 },
  { category: 'Jeringas y Agujas', name: 'Jeringa Estéril de 10 ml Sin Aguja c/100 piezas', unit: 'Caja', salePrice: 265.00, stock: 15, minStock: 3 },
  { category: 'Jeringas y Agujas', name: 'Jeringa Estéril de 10 ml Con Aguja c/100 piezas. Ambiderm', unit: 'Caja', salePrice: 170.00, stock: 30, minStock: 5 },
  { category: 'Jeringas y Agujas', name: 'Jeringa Estéril de 10 ml Con Aguja c/100 piezas. Nipro', unit: 'Caja', salePrice: 315.00, stock: 18, minStock: 4 },
  { category: 'Jeringas y Agujas', name: 'Jeringa Estéril de 20 ml Sin Aguja c/50 piezas', unit: 'Caja', salePrice: 190.00, stock: 20, minStock: 4 },
  { category: 'Jeringas y Agujas', name: 'Aguja Hipodérmica Rosa de 18 G x 38 mm (1 ½”) c/100 piezas. DL/Sensimedical', unit: 'Caja', salePrice: 65.00, stock: 30, minStock: 6 },
  { category: 'Jeringas y Agujas', name: 'Aguja Hipodérmica Rosa de 18 G x 38 mm (1 ½”) c/100 piezas. Nipro', unit: 'Caja', salePrice: 90.00, stock: 25, minStock: 5 },
  { category: 'Jeringas y Agujas', name: 'Aguja Hipodérmica Amarilla de 20 G x 38 mm (1 ½”) c/100 piezas. DL/Sensimedical', unit: 'Caja', salePrice: 65.00, stock: 30, minStock: 6 },
  { category: 'Jeringas y Agujas', name: 'Aguja Hipodérmica Amarilla de 20 G x 38 mm (1 ½”) c/100 piezas. Nipro', unit: 'Caja', salePrice: 90.00, stock: 20, minStock: 5 },
  { category: 'Jeringas y Agujas', name: 'Aguja Hipodérmica Verde de 21 G x 32 mm (1 ¼”) c/100 piezas. DL/Sensimedical', unit: 'Caja', salePrice: 65.00, stock: 40, minStock: 8 },
  { category: 'Jeringas y Agujas', name: 'Aguja Hipodérmica Verde de 21 G x 32 mm (1 ¼”) c/100 piezas. Nipro', unit: 'Caja', salePrice: 90.00, stock: 25, minStock: 5 },
  { category: 'Jeringas y Agujas', name: 'Aguja Hipodérmica Negra de 22 G x 32 mm (1 ¼”) c/100 piezas. DL/Sensimedical', unit: 'Caja', salePrice: 65.00, stock: 35, minStock: 7 },
  { category: 'Jeringas y Agujas', name: 'Aguja Hipodérmica Negra de 22 G x 32 mm (1 ¼”) c/100 piezas. Nipro', unit: 'Caja', salePrice: 90.00, stock: 20, minStock: 5 },
  { category: 'Jeringas y Agujas', name: 'Aguja Hipodérmica Azul de 23 G x 25 mm (1”) c/100 piezas. DL/Sensimedical', unit: 'Caja', salePrice: 65.00, stock: 30, minStock: 6 },
  { category: 'Jeringas y Agujas', name: 'Aguja Hipodérmica Azul de 23 G x 25 mm (1”) c/100 piezas. Nipro', unit: 'Caja', salePrice: 90.00, stock: 20, minStock: 5 },
  { category: 'Jeringas y Agujas', name: 'Aguja Hipodérmica Naranja de 25 G x 16 mm (5/8”) c/100 piezas. Nipro', unit: 'Caja', salePrice: 90.00, stock: 20, minStock: 5 },
  { category: 'Jeringas y Agujas', name: 'Agujas para Pluma de Insulina (31G x 8 mm) c/100 piezas. DL [Sobre Pedido]', unit: 'Caja', salePrice: 660.00, stock: 5, minStock: 2 },
  { category: 'Jeringas y Agujas', name: 'Jeringa de Insulina 0.3 ml, 31 G x 6 mm c/100 piezas. DL', unit: 'Caja', salePrice: 260.00, stock: 15, minStock: 3 },
  { category: 'Jeringas y Agujas', name: 'Jeringa de Insulina 0.5 ml, 31 G x 8 mm c/100 piezas. DL', unit: 'Caja', salePrice: 280.00, stock: 15, minStock: 3 },

  // D. ACCESO VENOSO, TERAPIA IV Y SOLUCIONES
  { category: 'Terapia IV y Soluciones', name: 'Catéter Intravenoso Periférico 18 G c/50 piezas (Punzocat)', unit: 'Caja', salePrice: 560.00, stock: 12, minStock: 3 },
  { category: 'Terapia IV y Soluciones', name: 'Catéter Intravenoso Periférico 20 G c/50 piezas (Punzocat)', unit: 'Caja', salePrice: 560.00, stock: 15, minStock: 3 },
  { category: 'Terapia IV y Soluciones', name: 'Catéter Intravenoso Periférico 22 G c/50 piezas (Punzocat)', unit: 'Caja', salePrice: 560.00, stock: 12, minStock: 3 },
  { category: 'Terapia IV y Soluciones', name: 'Equipo de Venoclisis Microgotero', unit: 'Pieza', salePrice: 12.00, stock: 60, minStock: 15 },
  { category: 'Terapia IV y Soluciones', name: 'Equipo de Venoclisis Normogotero', unit: 'Pieza', salePrice: 12.00, stock: 80, minStock: 20 },
  { category: 'Terapia IV y Soluciones', name: 'Llave de Tres Vías con Extensión', unit: 'Pieza', salePrice: 20.00, stock: 50, minStock: 10 },
  { category: 'Terapia IV y Soluciones', name: 'Tapón Heparinizado', unit: 'Pieza', salePrice: 20.00, stock: 45, minStock: 10 },
  { category: 'Terapia IV y Soluciones', name: 'Torniquete Adulto', unit: 'Pieza', salePrice: 65.00, stock: 20, minStock: 5 },
  { category: 'Terapia IV y Soluciones', name: 'Torniquete Pediátrico', unit: 'Pieza', salePrice: 65.00, stock: 15, minStock: 4 },
  { category: 'Terapia IV y Soluciones', name: 'Solución Hartmann de 1000 ml', unit: 'Pieza', salePrice: 37.00, stock: 40, minStock: 10 },
  { category: 'Terapia IV y Soluciones', name: 'Solución Hartmann de 500 ml', unit: 'Pieza', salePrice: 30.00, stock: 35, minStock: 10 },
  { category: 'Terapia IV y Soluciones', name: 'Solución Fisiológica Cloruro de Sodio 0.9% 100 ml', unit: 'Pieza', salePrice: 25.00, stock: 50, minStock: 12 },
  { category: 'Terapia IV y Soluciones', name: 'Solución Fisiológica Cloruro de Sodio 0.9% 250 ml', unit: 'Pieza', salePrice: 28.00, stock: 45, minStock: 12 },
  { category: 'Terapia IV y Soluciones', name: 'Solución Fisiológica Cloruro de Sodio 0.9% 500 ml', unit: 'Pieza', salePrice: 30.00, stock: 60, minStock: 15 },
  { category: 'Terapia IV y Soluciones', name: 'Solución Fisiológica Cloruro de Sodio 0.9% 1000 ml', unit: 'Pieza', salePrice: 37.00, stock: 70, minStock: 15 },

  // E. SUTURAS Y PROCEDIMIENTO MENOR
  { category: 'Suturas y Cirugía Menor', name: 'Sutura Nylon Monofilamento 2-0 Aguja Cortante c/12 piezas. American', unit: 'Caja', salePrice: 450.00, stock: 10, minStock: 2 },
  { category: 'Suturas y Cirugía Menor', name: 'Sutura Nylon Monofilamento 3-0 Aguja Cortante c/12 piezas. American', unit: 'Caja', salePrice: 450.00, stock: 15, minStock: 3 },
  { category: 'Suturas y Cirugía Menor', name: 'Sutura Nylon Monofilamento 4-0 Aguja Cortante c/12 piezas. American', unit: 'Caja', salePrice: 600.00, stock: 12, minStock: 3 },
  { category: 'Suturas y Cirugía Menor', name: 'Sutura Nylon Monofilamento 5-0 Aguja Cortante c/12 piezas. American', unit: 'Caja', salePrice: 520.00, stock: 10, minStock: 2 },
  { category: 'Suturas y Cirugía Menor', name: 'Sutura Polipropileno (Prolene) 2-0 Aguja Cortante c/12 piezas. Atramat', unit: 'Caja', salePrice: 720.00, stock: 8, minStock: 2 },
  { category: 'Suturas y Cirugía Menor', name: 'Sutura Polipropileno (Prolene) 3-0 Aguja Cortante c/12 piezas. Atramat', unit: 'Caja', salePrice: 720.00, stock: 10, minStock: 2 },
  { category: 'Suturas y Cirugía Menor', name: 'Sutura Polipropileno (Prolene) 4-0 Aguja Cortante c/12 piezas. Atramat', unit: 'Caja', salePrice: 1800.00, stock: 5, minStock: 1 },
  { category: 'Suturas y Cirugía Menor', name: 'Sutura Seda Negra 2-0 c/12 piezas. American', unit: 'Caja', salePrice: 450.00, stock: 10, minStock: 2 },
  { category: 'Suturas y Cirugía Menor', name: 'Sutura Seda Negra 3-0 c/12 piezas. American', unit: 'Caja', salePrice: 450.00, stock: 12, minStock: 3 },
  { category: 'Suturas y Cirugía Menor', name: 'Sutura Seda Negra 4-0 c/12 piezas. American', unit: 'Caja', salePrice: 620.00, stock: 8, minStock: 2 },
  { category: 'Suturas y Cirugía Menor', name: 'Sutura Absorbible (Vicryl) 2-0 c/12 piezas. American', unit: 'Caja', salePrice: 700.00, stock: 10, minStock: 2 },
  { category: 'Suturas y Cirugía Menor', name: 'Sutura Absorbible (Vicryl) 3-0 c/12 piezas. American', unit: 'Caja', salePrice: 700.00, stock: 12, minStock: 3 },
  { category: 'Suturas y Cirugía Menor', name: 'Sutura Absorbible (Vicryl) 4-0 c/12 piezas. American', unit: 'Caja', salePrice: 700.00, stock: 10, minStock: 2 },
  { category: 'Suturas y Cirugía Menor', name: 'Hoja de Bisturí No. 10 c/100 piezas', unit: 'Caja', salePrice: 245.00, stock: 15, minStock: 3 },
  { category: 'Suturas y Cirugía Menor', name: 'Hoja de Bisturí No. 11 c/100 piezas', unit: 'Caja', salePrice: 245.00, stock: 15, minStock: 3 },
  { category: 'Suturas y Cirugía Menor', name: 'Hoja de Bisturí No. 15 c/100 piezas', unit: 'Caja', salePrice: 245.00, stock: 18, minStock: 4 },
  { category: 'Suturas y Cirugía Menor', name: 'Mango para Bisturí No. 3', unit: 'Pieza', salePrice: 75.00, stock: 25, minStock: 5 },
  { category: 'Suturas y Cirugía Menor', name: 'Mango para Bisturí No. 4', unit: 'Pieza', salePrice: 75.00, stock: 25, minStock: 5 },
  { category: 'Suturas y Cirugía Menor', name: 'Kit de Sutura con Instrumental Básico', unit: 'Pieza', salePrice: 490.00, stock: 10, minStock: 2 },

  // F. ANTISEPSIA, IRRIGACIÓN Y CUIDADO DE HERIDAS
  { category: 'Antisepsia y Cuidado de Heridas', name: 'Nina Scrub Galón (Gluconato de Clorhexidina al 4%) 3.78 Litros [Sobre Pedido]', unit: 'Galón', salePrice: 1270.00, stock: 4, minStock: 1 },
  { category: 'Antisepsia y Cuidado de Heridas', name: 'Nina Scrub 950 ml (Gluconato de Clorhexidina al 4%) 0.950 L [Sobre Pedido]', unit: 'Pieza', salePrice: 355.00, stock: 6, minStock: 2 },
  { category: 'Antisepsia y Cuidado de Heridas', name: 'Alcohol Etílico 70% de 250 ml', unit: 'Pieza', salePrice: 20.00, stock: 50, minStock: 10 },
  { category: 'Antisepsia y Cuidado de Heridas', name: 'Alcohol Etílico 70% de 500 ml', unit: 'Pieza', salePrice: 28.00, stock: 45, minStock: 10 },
  { category: 'Antisepsia y Cuidado de Heridas', name: 'Alcohol Etílico 70% de 1000 ml', unit: 'Pieza', salePrice: 62.00, stock: 60, minStock: 15 },
  { category: 'Antisepsia y Cuidado de Heridas', name: 'Agua Oxigenada (Peróxido de Hidrógeno) de 480 ml', unit: 'Pieza', salePrice: 20.00, stock: 40, minStock: 10 },
  { category: 'Antisepsia y Cuidado de Heridas', name: 'Agua Oxigenada (Peróxido de Hidrógeno) de 1000 ml', unit: 'Pieza', salePrice: 38.00, stock: 35, minStock: 8 },
  { category: 'Antisepsia y Cuidado de Heridas', name: 'Jabón Quirúrgico / Solución Antiséptica de 3.850 L', unit: 'Galón', salePrice: 155.00, stock: 10, minStock: 2 },
  { category: 'Antisepsia y Cuidado de Heridas', name: 'Jabón Quirúrgico / Solución Antiséptica de 1000 ml [Sobre Pedido]', unit: 'Pieza', salePrice: 65.00, stock: 15, minStock: 3 },
  { category: 'Antisepsia y Cuidado de Heridas', name: 'Apósito Hidrocoloide 10 x 10 cm', unit: 'Pieza', salePrice: 100.00, stock: 25, minStock: 5 },
  { category: 'Antisepsia y Cuidado de Heridas', name: 'Apósito Hidrocoloide 15 x 21 cm', unit: 'Pieza', salePrice: 140.00, stock: 20, minStock: 5 },
  { category: 'Antisepsia y Cuidado de Heridas', name: 'Película Transparente para Heridas (Tegaderm 10 x 12 cm) c/50 piezas', unit: 'Caja', salePrice: 550.00, stock: 12, minStock: 3 },
  { category: 'Antisepsia y Cuidado de Heridas', name: 'Película Transparente para Heridas (Tegaderm 6 x 7 cm) c/50 piezas', unit: 'Caja', salePrice: 270.00, stock: 15, minStock: 3 },

  // G. DIAGNÓSTICO, SIGNOS VITALES Y DIABETES
  { category: 'Diagnóstico y Signos Vitales', name: 'Glucómetro Accu Chek Active', unit: 'Pieza', salePrice: 560.00, stock: 12, minStock: 3 },
  { category: 'Diagnóstico y Signos Vitales', name: 'Tiras Reactivas Accu Chek Active c/50 piezas', unit: 'Caja', salePrice: 330.00, stock: 20, minStock: 5 },
  { category: 'Diagnóstico y Signos Vitales', name: 'Lancetas c/100 piezas', unit: 'Caja', salePrice: 50.00, stock: 40, minStock: 10 },
  { category: 'Diagnóstico y Signos Vitales', name: 'Baumanómetro Aneroide Adulto. Checkatek', unit: 'Pieza', salePrice: 265.00, stock: 15, minStock: 3 },
  { category: 'Diagnóstico y Signos Vitales', name: 'Estetoscopio Adulto. Checkatek', unit: 'Pieza', salePrice: 406.00, stock: 15, minStock: 3 },
  { category: 'Diagnóstico y Signos Vitales', name: 'Oxímetro de Pulso Adulto', unit: 'Pieza', salePrice: 270.00, stock: 18, minStock: 4 },
  { category: 'Diagnóstico y Signos Vitales', name: 'Oxímetro de Pulso Pediátrico / Infantil', unit: 'Pieza', salePrice: 250.00, stock: 12, minStock: 3 },
  { category: 'Diagnóstico y Signos Vitales', name: 'Termómetro Digital Clínico', unit: 'Pieza', salePrice: 80.00, stock: 30, minStock: 6 },
  { category: 'Diagnóstico y Signos Vitales', name: 'Martillo de Reflejos Neurológico', unit: 'Pieza', salePrice: 110.00, stock: 15, minStock: 3 },
  { category: 'Diagnóstico y Signos Vitales', name: 'Cinta Métrica Clínica. SECA 201', unit: 'Pieza', salePrice: 420.00, stock: 8, minStock: 2 },
  { category: 'Diagnóstico y Signos Vitales', name: 'Estuche de Diagnóstico Otoscopio / Oftalmoscopio. Timesco', unit: 'Pieza', salePrice: 3000.00, stock: 4, minStock: 1 },
  { category: 'Diagnóstico y Signos Vitales', name: 'Estuche de Diagnóstico Otoscopio / Oftalmoscopio. Welch Allyn', unit: 'Pieza', salePrice: 8000.00, stock: 2, minStock: 1 },

  // H. TOMA Y RECOLECCIÓN DE MUESTRAS
  { category: 'Toma de Muestras', name: 'Vaso Recolector de Orina Estéril', unit: 'Pieza', salePrice: 5.00, stock: 150, minStock: 30 },
  { category: 'Toma de Muestras', name: 'Abatelenguas de Madera c/500 piezas. Ambiderm', unit: 'Paquete', salePrice: 160.00, stock: 25, minStock: 5 },

  // I. VÍA AÉREA, OXÍGENO Y URGENCIAS BÁSICAS
  { category: 'Vía Aérea y Oxígeno', name: 'Mascarilla para Oxígeno Pediátrica/Adulto', unit: 'Pieza', salePrice: 40.00, stock: 35, minStock: 8 },
  { category: 'Vía Aérea y Oxígeno', name: 'Puntas Nasales Pediátrica/Adulto', unit: 'Pieza', salePrice: 13.00, stock: 60, minStock: 15 },
  { category: 'Vía Aérea y Oxígeno', name: 'Mascarilla con Reservorio Pediátrica/Adulto', unit: 'Pieza', salePrice: 65.00, stock: 25, minStock: 5 },
  { category: 'Vía Aérea y Oxígeno', name: 'Micronebulizador / Mascarilla para Nebulización Adulto / Pediátrica', unit: 'Pieza', salePrice: 53.00, stock: 30, minStock: 8 },

  // J. INMOVILIZACIÓN Y APOYO
  { category: 'Inmovilización y Apoyo', name: 'Collarín Cervical (CH / M / G o Ajustable)', unit: 'Pieza', salePrice: 85.00, stock: 15, minStock: 3 },
  { category: 'Inmovilización y Apoyo', name: 'Compresa Fría/Calor Reutilizable de 30 x 18 cm [Sobre Pedido]', unit: 'Pieza', salePrice: 270.00, stock: 10, minStock: 2 },

  // K. DESECHABLES, HIGIENE, ABSORBENTES Y RPBI
  { category: 'Higiene, Desechables y RPBI', name: 'Protector / Cubrecama Absorbente Desechable c/10 piezas', unit: 'Paquete', salePrice: 90.00, stock: 30, minStock: 6 },
  { category: 'Higiene, Desechables y RPBI', name: 'Contenedor Rígido para Punzocortantes de 1.5 L (RPBI)', unit: 'Pieza', salePrice: 45.00, stock: 25, minStock: 5 },
  { category: 'Higiene, Desechables y RPBI', name: 'Contenedor Rígido para Punzocortantes de 4 L (RPBI)', unit: 'Pieza', salePrice: 150.00, stock: 20, minStock: 4 },
  { category: 'Higiene, Desechables y RPBI', name: 'Bolsa Roja RPBI de 50 x 60 cm', unit: 'Pieza', salePrice: 6.00, stock: 200, minStock: 40 },
  { category: 'Higiene, Desechables y RPBI', name: 'Bolsa Amarilla RPBI de 50 x 60 cm', unit: 'Pieza', salePrice: 6.00, stock: 200, minStock: 40 },
  { category: 'Higiene, Desechables y RPBI', name: 'Aplicador con Punta de Algodón No Estéril c/1000 piezas. Ambiderm', unit: 'Caja', salePrice: 130.00, stock: 20, minStock: 4 },
  { category: 'Higiene, Desechables y RPBI', name: 'Aplicador con Punta de Algodón Estéril c/100 paq. c/3 pzas c/u. Protec', unit: 'Paquete', salePrice: 360.00, stock: 15, minStock: 3 },
  { category: 'Higiene, Desechables y RPBI', name: 'Torundas de Algodón Sin Alcohol de 500 grs', unit: 'Bolsa', salePrice: 116.00, stock: 25, minStock: 5 },
  { category: 'Higiene, Desechables y RPBI', name: 'Toalla Alcoholada c/100 piezas', unit: 'Caja', salePrice: 75.00, stock: 40, minStock: 10 },
  { category: 'Higiene, Desechables y RPBI', name: 'Gel Alcoholado 70% de 500 ml', unit: 'Pieza', salePrice: 45.00, stock: 35, minStock: 8 }
];

async function seed() {
  console.log('--- Limpiando e Inicializando Catálogo Médico Real CuraMed ---');

  // Limpiar relaciones previas para evitar colisiones
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.cashShift.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();

  // 1. Usuarios
  const adminPassword = await bcrypt.hash('admin123', 10);
  const cajeroPassword = await bcrypt.hash('cajero123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@curamed.com' },
    update: { password: adminPassword },
    create: {
      name: 'Dr. Roberto Mendoza (Admin)',
      email: 'admin@curamed.com',
      password: adminPassword,
      role: 'admin',
      active: true,
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
    }
  });

  const cajero = await prisma.user.upsert({
    where: { email: 'cajero@curamed.com' },
    update: { password: cajeroPassword },
    create: {
      name: 'Lic. Laura Ríos (Cajera)',
      email: 'cajero@curamed.com',
      password: cajeroPassword,
      role: 'cajero',
      active: true,
      avatar: 'https://images.unsplash.com/photo-1594824813639-9527a9c395b0?w=150&auto=format&fit=crop&q=80'
    }
  });

  console.log('✓ Usuarios creados: admin@curamed.com y cajero@curamed.com');

  // 2. Clientes
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Clínica Quirúrgica Santa María',
      phone: '55-1234-5678',
      email: 'compras@santamaria.med.mx',
      rfc: 'CSM980512KL1',
      address: 'Calle Hospitalaria 45, Col. Doctores',
      creditBalance: 2500,
      notes: 'Cliente con crédito autorizado a 15 días.'
    }
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Dr. Alejandro Morales Sánchez',
      phone: '55-9876-5432',
      email: 'dr.morales@gmail.com',
      rfc: 'MOSA800415M82',
      address: 'Consultorio 302, Torre Médica Ángeles',
      creditBalance: 0,
      notes: 'Cirujano General. Suturas y jeringas.'
    }
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Dra. Elena Vázquez Cruz',
      phone: '55-3344-5566',
      email: 'dra.vazquez@outlook.com',
      rfc: 'VACE851020HJ3',
      address: 'Centro Pediátrico Sur, Av. Universidad 1200',
      creditBalance: 0,
      notes: 'Material pediátrico y guantes chicos.'
    }
  });

  console.log('✓ Clientes registrados');

  // 3. Catálogo de Productos Reales
  const categoryPrefixMap = {
    'Material de Curación y Fijación': 'MCF',
    'Guantes y Protección': 'GBP',
    'Jeringas y Agujas': 'JAA',
    'Terapia IV y Soluciones': 'TIV',
    'Suturas y Cirugía Menor': 'SCM',
    'Antisepsia y Cuidado de Heridas': 'ACH',
    'Diagnóstico y Signos Vitales': 'DSV',
    'Toma de Muestras': 'TRM',
    'Vía Aérea y Oxígeno': 'VAO',
    'Inmovilización y Apoyo': 'INA',
    'Higiene, Desechables y RPBI': 'HDR'
  };

  const createdProducts = [];
  for (let i = 0; i < realMedicalProducts.length; i++) {
    const item = realMedicalProducts[i];
    const prefix = categoryPrefixMap[item.category] || 'MED';
    const sku = `${prefix}-${String(i + 1).padStart(3, '0')}`;
    const barcode = `750${String(1000000000 + i + 1)}`;
    const purchaseCost = Math.round(item.salePrice * 0.65 * 100) / 100;

    const prod = await prisma.product.create({
      data: {
        name: item.name,
        sku,
        barcode,
        description: `${item.name} (${item.unit}) de uso hospitalario y clínico esterilizado.`,
        category: item.category,
        purchasePrice: purchaseCost,
        salePrice: item.salePrice,
        currentStock: item.stock,
        minStock: item.minStock,
        unit: item.unit,
        supplier: item.name.includes('Nipro') ? 'Nipro Medical' : item.name.includes('Ambiderm') ? 'Ambiderm' : item.name.includes('DL') ? 'DL Médica' : item.name.includes('Atramat') ? 'Atramat' : item.name.includes('Checkatek') ? 'Checkatek' : 'Distribuidora Médica Especializada',
        status: true
      }
    });
    createdProducts.push(prod);
  }
  console.log(`✓ ${createdProducts.length} Productos reales del inventario médico guardados exitosamente`);

  console.log('✓ Semilla del inventario real completada con éxito (Sin ventas ficticias ni turnos forzados).');
}

seed()
  .catch((e) => {
    console.error('Error durante la semilla:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
