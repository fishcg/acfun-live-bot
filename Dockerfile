FROM node:11.1.0-alpine

# 安装 Python
RUN cd /etc/apk/ && echo "https://mirrors.ustc.edu.cn/alpine/v3.6/main/" > repositories \
    && echo "https://mirrors.ustc.edu.cn/alpine/v3.6/community/" >> repositories \
    && apk update && apk add python3 \
    && pip3 install --upgrade pip

WORKDIR /home/www/node-web

COPY package.json entrypoint.sh requirements.txt ./

RUN pip3 install -r requirements.txt && npm config set registry https://registry.npm.taobao.org \
    && npm install

COPY . .

RUN chmod +x ./entrypoint.sh \
    && mkdir .runtime \
    && chmod -R a+w .runtime/

USER nobody

ENTRYPOINT ["./entrypoint.sh"]
