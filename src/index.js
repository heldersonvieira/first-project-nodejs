const { response } = require('express');
const express = require('express');
const { v4: uuidV4 } = require('uuid');

const app = express();
app.use(express.json());

// banco de dados fake
/**
 * cpf - string
 * name - string
 * id - uuid
 * statement - []
 */
const customers = [];

// Middleware
function verifyIfExistsAccountCPF(request, response, next) {
    const { cpf } = request.headers;
    const customer = customers.find(customer => customer.cpf === cpf);

    if (!customer) {
        return response.status(400).json('Customer not found');
    };

    /**
     * dando acesso para todas as rotas e middlewares que utilizarem
     * ao customer validado pelo middleware verifyIfExistsAccountCPF
     */
    request.customer = customer;

    return next();
};

function getBalance(statement) {
    const balance = statement.reduce((acumulator, operation) => {
        if (operation.type === 'credit') {
            return acumulator + operation.amount;
        } else {
            return acumulator - operation.amount;
        }
    }, 0);

    return balance;
};

app.post('/account', (request, response) => {
    const { cpf, name } = request.body;
    const customerAlreadyExists = customers.some(customer => customer.cpf === cpf);

    if (customerAlreadyExists) {
        return response.status(400).json({ error: 'Customer already exists' });
    }
    
    customers.push({
        cpf,
        name,
        id: uuidV4(),
        statement: []
    });

    return response.status(201).send();
});

/**
 * Há duas formas de usar o middleware.
 * A primeira delas é passando para todas as rotas, com o método use()
 * 
 * EX. app.use(verifyIfExistsAccountCPF);
 * 
 * A outra forma é passando diretamente no método que será usado.
 * app.get('/statement', verifyIfExistsAccountCPF, (request, response) => {...
 */
app.get('/statement', verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request; // customer validado pelo middelrware

    return response.json(customer.statement);
});

app.post('/deposit', verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request; // customer validado pelo middelrware
    const { description, amount } = request.body;
    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: 'credit'
    };

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

app.post('/withdraw', verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request; // customer validado pelo middelrware
    const { amount } = request.body;
    const balance = getBalance(customer.statement);

    if (balance < amount) {
        return response.status(400).json({ error: 'Insufficient funds!' })
    };

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: 'debit'
    };

    customer.statement.push(statementOperation);
    console.log(customer);
    return response.status(201).send();
})

app.get('/statement/date', verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    const { date } = request.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter(statement => 
        statement.created_at.toDateString() === new Date(dateFormat).toDateString()
    );


    return response.status(201).json(customer.statement);
})

app.put('/account', verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    const { name } = request.body;

    customer.name = name;

    return response.status(201).send();
})

app.get('/account', verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    return response.status(201).json(customer);
})

app.delete('/account', verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    customers.splice(customer, 1);

    return response.status(200).json(customers);
})

app.get('/balance', verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    const balance = getBalance(customer.statement);

    return response.json(balance);
})

app.listen(3333, () => {
    return console.log('PORT 3333 listening...')
});
