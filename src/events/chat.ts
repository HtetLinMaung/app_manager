module.exports = (io: any, socket: any) => (anotherSocketId: any, msg: any) => {
  socket.to(anotherSocketId).emit("chat", socket.id, msg);
};
