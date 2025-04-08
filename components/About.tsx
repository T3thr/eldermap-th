'use client';

import { motion } from 'framer-motion';
import { X, Clock, MapPin, Book, Users, Heart ,Construction} from 'lucide-react';

interface AboutProps {
  onClose: () => void;
}

const About = ({ onClose }: AboutProps) => {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-card rounded-xl shadow-xl w-full max-w-lg p-6 relative glass-effect"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-foreground/70 hover:text-primary transition-colors p-1 rounded-full hover:bg-accent/10"
          aria-label="ปิด"
        >
          <motion.div whileHover={{ rotate: 90 }} transition={{ duration: 0.2 }}>
            <X size={20} />
          </motion.div>
        </button>

        <motion.div
          className="mb-6 border-b border-glass-border pb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-2xl font-bold text-primary mb-2 flex items-center font-thai">
            <Book className="mr-2" size={24} />
            Elder Map
          </h3>
          <p className="text-foreground/80 font-thai">
            สำรวจมรดกทางวัฒนธรรมและประวัติศาสตร์อันหลากหลายของจังหวัดในประเทศไทยผ่านแพลตฟอร์มเชิงโต้ตอบของเรา
          </p>
        </motion.div>

        <div className="space-y-4">
          <motion.div
            className="p-3 rounded-lg bg-accent/5 border border-glass-border"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
          >
            <h4 className="font-medium text-primary flex items-center mb-2 font-thai">
              <Clock className="mr-2" size={18} />
              จุดประสงค์ของแพลตฟอร์มนี้
            </h4>
            <p className="text-sm text-foreground/80 font-thai">
              เพื่อทำให้การเดินทางทางประวัติศาสตร์ของประเทศไทยเข้าถึงได้ สนุก และน่าสนใจ เหมาะสำหรับทุกเพศ ทุกวัย
            </p>
          </motion.div>

          <motion.div
            className="p-3 rounded-lg bg-accent/5 border border-glass-border"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            <h4 className="font-medium text-primary flex items-center mb-2 font-thai">
              <MapPin className="mr-2" size={18} />
              INTERACTIVE Platform
            </h4>
            <p className="text-sm text-foreground/80 font-thai">
              แต่ละอำเภอถูกถูกแสดงด้วยรูปร่างทางภูมิศาสตร์บนแผนที่เสมือนจริงที่ให้ข้อมูลประวัติศาสตร์ รูปภาพ และเหตุการณ์สำคัญตั้งแต่อดีตจนถึงปัจจุบัน
            </p>
          </motion.div>

          <motion.div
            className="p-3 rounded-lg bg-accent/5 border border-glass-border"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
          >
            <h4 className="font-medium text-primary flex items-center mb-2 font-thai">
              <Users className="mr-2" size={18} />
              ผู้พัฒนา
            </h4>
            <p className="text-sm text-foreground/80 font-thai">
              สวัสดีครับ ผมนายธีรภัทร ภู่ระย้า ผู้พัฒนาแพลตฟอร์ม ผมอยากที่จะการอนุรักษ์และต้องการเผบแพร่มรดกทางวัฒนธรรมของประเทศไทยผ่านแพลตฟอร์มเชิงโต้ตอบที่ผมสร้างขึ้น
            </p>
          </motion.div>
        </div>

        <motion.div
          className="mt-6 pt-4 border-t border-glass-border flex justify-between items-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="text-xs text-foreground/60 flex items-center font-thai">
            <Construction size={14} className="mr-1 text-primary" />
            เว็บไซต์อยู่ในช่วงกำลังพัฒนา...
          </div>

          <motion.button
            onClick={onClose}
            className="bg-primary text-background font-medium py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-thai"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Explore now
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default About;